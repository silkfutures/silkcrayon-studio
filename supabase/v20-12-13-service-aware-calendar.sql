-- V20.12.13 — let selected services remain bookable during imported Apple events.
alter table public.external_calendars add column if not exists ignored_service_slugs text[] not null default '{}'::text[];
alter table public.blockouts add column if not exists ignored_service_slugs text[] not null default '{}'::text[];

create or replace function public.replace_external_calendar_blockouts(p_source_id uuid,p_blocks jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer; source_ignored text[];
begin
  perform pg_advisory_xact_lock(hashtext(p_source_id::text));
  select ignored_service_slugs into source_ignored from public.external_calendars where id=p_source_id;
  if not found then raise exception 'calendar_not_found'; end if;
  delete from public.blockouts where external_calendar_id=p_source_id;
  insert into public.blockouts(booking_date,start_time,end_time,reason,external_calendar_id,external_event_key,ignored_service_slugs)
  select (x->>'booking_date')::date,(x->>'start_time')::time,(x->>'end_time')::time,left(x->>'reason',240),p_source_id,x->>'external_event_key',coalesce(source_ignored,'{}'::text[])
  from jsonb_array_elements(coalesce(p_blocks,'[]'::jsonb)) x
  where (x->>'start_time')::time < (x->>'end_time')::time
  on conflict (external_calendar_id,external_event_key) where external_calendar_id is not null do nothing;
  get diagnostics inserted_count=row_count;return inserted_count;
end;$$;
revoke all on function public.replace_external_calendar_blockouts(uuid,jsonb) from public;
grant execute on function public.replace_external_calendar_blockouts(uuid,jsonb) to service_role;

create or replace function public.reserve_booking(
  p_customer_id uuid,p_service_slug text,p_service_name text,p_booking_date date,p_start_time time,p_end_time time,
  p_duration_minutes integer,p_genre text,p_notes text,p_amount_pence integer,p_hold_expires_at timestamptz,
  p_harmful_music_policy_accepted boolean default false
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_booking_date::text));
  if exists(select 1 from public.blockouts b where b.booking_date=p_booking_date and not (p_service_slug=any(coalesce(b.ignored_service_slugs,'{}'::text[]))) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'slot_unavailable'; end if;
  if exists(select 1 from public.bookings b where b.booking_date=p_booking_date and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'slot_unavailable'; end if;
  insert into public.bookings(customer_id,service_slug,service_name,booking_date,start_time,end_time,duration_minutes,genre,notes,amount_pence,status,payment_status,hold_expires_at,harmful_music_policy_accepted,policy_accepted_at)
  values(p_customer_id,p_service_slug,p_service_name,p_booking_date,p_start_time,p_end_time,p_duration_minutes,p_genre,p_notes,p_amount_pence,'pending','unpaid',p_hold_expires_at,p_harmful_music_policy_accepted,case when p_harmful_music_policy_accepted then now() else null end)
  returning id into new_id;return new_id;
end;$$;
revoke all on function public.reserve_booking(uuid,text,text,date,time,time,integer,text,text,integer,timestamptz,boolean) from public;

create or replace function public.reserve_credit_booking(
  p_customer_id uuid,p_service_slug text,p_service_name text,p_booking_date date,p_start_time time,p_end_time time,
  p_duration_minutes integer,p_genre text,p_notes text,p_amount_pence integer,p_harmful_music_policy_accepted boolean default true
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;needed_hours numeric(8,2);available_hours numeric(8,2);
begin
  needed_hours:=p_duration_minutes::numeric/60;
  perform pg_advisory_xact_lock(hashtext('credits:'||p_customer_id::text));perform pg_advisory_xact_lock(hashtext(p_booking_date::text));
  select coalesce(sum(hours_delta),0) into available_hours from public.credit_ledger where customer_id=p_customer_id;
  if available_hours<needed_hours then raise exception 'insufficient_credits'; end if;
  if exists(select 1 from public.blockouts b where b.booking_date=p_booking_date and not (p_service_slug=any(coalesce(b.ignored_service_slugs,'{}'::text[]))) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'slot_unavailable'; end if;
  if exists(select 1 from public.bookings b where b.booking_date=p_booking_date and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'slot_unavailable'; end if;
  insert into public.bookings(customer_id,service_slug,service_name,booking_date,start_time,end_time,duration_minutes,genre,notes,amount_pence,status,payment_status,hold_expires_at,harmful_music_policy_accepted,policy_accepted_at,payment_method)
  values(p_customer_id,p_service_slug,p_service_name,p_booking_date,p_start_time,p_end_time,p_duration_minutes,p_genre,p_notes,p_amount_pence,'confirmed','paid',null,p_harmful_music_policy_accepted,case when p_harmful_music_policy_accepted then now() else null end,'credits') returning id into new_id;
  insert into public.credit_ledger(customer_id,booking_id,hours_delta,note) values(p_customer_id,new_id,-needed_hours,'Studio hours used for '||p_service_name||' · '||p_booking_date::text);
  return new_id;
end;$$;

create or replace function public.approve_booking_reschedule_locked(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id=p_booking_id for update;if not found then raise exception 'booking_not_found'; end if;
  if b.change_request_status<>'pending' or b.change_requested_date is null or b.change_requested_start is null or b.change_requested_end is null then raise exception 'no_pending_request'; end if;
  perform pg_advisory_xact_lock(hashtext(b.change_requested_date::text));
  if exists(select 1 from public.blockouts x where x.booking_date=b.change_requested_date and not (b.service_slug=any(coalesce(x.ignored_service_slugs,'{}'::text[]))) and b.change_requested_start<x.end_time and b.change_requested_end>x.start_time) then raise exception 'slot_unavailable'; end if;
  if exists(select 1 from public.bookings x where x.id<>b.id and x.booking_date=b.change_requested_date and x.status in ('pending','confirmed') and (x.status='confirmed' or x.hold_expires_at is null or x.hold_expires_at>now()) and b.change_requested_start<x.end_time and b.change_requested_end>x.start_time) then raise exception 'slot_unavailable'; end if;
  update public.bookings set booking_date=b.change_requested_date,start_time=b.change_requested_start,end_time=b.change_requested_end,customer_rescheduled_at=now(),change_request_status='approved',change_request_resolved_at=now(),updated_at=now() where id=b.id;
  return jsonb_build_object('ok',true,'booking_id',b.id);
end;$$;
revoke all on function public.approve_booking_reschedule_locked(uuid) from public,anon,authenticated;

-- Silkcrayon Studio OS V20.2.6 — release hardening
begin;

alter table public.customers
  add column if not exists email_signup_discount_available boolean not null default false,
  add column if not exists email_signup_discount_used_at timestamptz;

alter table public.crm_contacts
  add column if not exists email_signup_discount_available boolean not null default false,
  add column if not exists email_signup_discount_used_at timestamptz;

create table if not exists public.api_rate_limits(
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
alter table public.api_rate_limits enable row level security;

create or replace function public.consume_api_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare r public.api_rate_limits%rowtype;
begin
  if p_limit<1 or p_window_seconds<1 then return false; end if;
  select * into r from public.api_rate_limits where key=p_key for update;
  if not found then insert into public.api_rate_limits(key,window_start,count) values(p_key,now(),1);return true; end if;
  if r.window_start < now() - make_interval(secs=>p_window_seconds) then update public.api_rate_limits set window_start=now(),count=1 where key=p_key;return true; end if;
  if r.count>=p_limit then return false; end if;
  update public.api_rate_limits set count=count+1 where key=p_key;return true;
end; $$;
revoke all on function public.consume_api_rate_limit(text,integer,integer) from public,anon,authenticated;

create or replace function public.create_blockout_locked(p_booking_date date,p_start_time time,p_end_time time,p_reason text default null)
returns public.blockouts language plpgsql security definer set search_path=public as $$
declare outrow public.blockouts;
begin
  if p_end_time<=p_start_time then raise exception 'invalid_time_range'; end if;
  perform pg_advisory_xact_lock(hashtext(p_booking_date::text));
  if exists(select 1 from public.bookings b where b.booking_date=p_booking_date and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'booking_overlap'; end if;
  insert into public.blockouts(booking_date,start_time,end_time,reason) values(p_booking_date,p_start_time,p_end_time,p_reason) returning * into outrow;
  return outrow;
end; $$;
revoke all on function public.create_blockout_locked(date,time,time,text) from public,anon,authenticated;

create or replace function public.approve_booking_reschedule_locked(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings%rowtype;
begin
  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.change_request_status<>'pending' or b.change_requested_date is null or b.change_requested_start is null or b.change_requested_end is null then raise exception 'no_pending_request'; end if;
  perform pg_advisory_xact_lock(hashtext(b.change_requested_date::text));
  if exists(select 1 from public.blockouts x where x.booking_date=b.change_requested_date and b.change_requested_start<x.end_time and b.change_requested_end>x.start_time) then raise exception 'slot_unavailable'; end if;
  if exists(select 1 from public.bookings x where x.id<>b.id and x.booking_date=b.change_requested_date and x.status in ('pending','confirmed') and (x.status='confirmed' or x.hold_expires_at is null or x.hold_expires_at>now()) and b.change_requested_start<x.end_time and b.change_requested_end>x.start_time) then raise exception 'slot_unavailable'; end if;
  update public.bookings set booking_date=b.change_requested_date,start_time=b.change_requested_start,end_time=b.change_requested_end,customer_rescheduled_at=now(),change_request_status='approved',change_request_resolved_at=now(),updated_at=now() where id=b.id;
  return jsonb_build_object('ok',true,'booking_id',b.id);
end; $$;
revoke all on function public.approve_booking_reschedule_locked(uuid) from public,anon,authenticated;

create or replace function public.delete_test_customer(p_customer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_email text;v_booking_count integer;
begin
  select email into v_email from public.customers where id=p_customer_id for update;
  if v_email is null then raise exception 'customer_not_found'; end if;
  if exists(select 1 from public.bookings where customer_id=p_customer_id and coalesce(amount_pence,0)>100) then raise exception 'real_booking_exists'; end if;
  if exists(select 1 from public.bookings where customer_id=p_customer_id and payment_status in ('paid','part_refunded')) then raise exception 'paid_test_booking_exists'; end if;
  select count(*) into v_booking_count from public.bookings where customer_id=p_customer_id;
  delete from public.refund_operations where booking_id in (select id from public.bookings where customer_id=p_customer_id);
  delete from public.bookings where customer_id=p_customer_id;
  delete from public.crm_contacts where customer_id=p_customer_id or lower(email)=lower(v_email);
  delete from public.customers where id=p_customer_id;
  return jsonb_build_object('ok',true,'customer_id',p_customer_id,'email',v_email,'bookings_deleted',v_booking_count);
end; $$;
revoke all on function public.delete_test_customer(uuid) from public,anon,authenticated;

commit;

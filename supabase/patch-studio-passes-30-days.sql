-- SILKCRAYON Studio Pass 30-day expiration (apply before enabling checkout).
-- Passes expire 30 * 24 hours after Stripe checkout creation; bookings must occur by expiry.
create table if not exists public.studio_pass_purchases (
 payment_id uuid primary key references public.studio_payments(id) on delete cascade,
 customer_id uuid not null references public.customers(id) on delete cascade,
 hours_purchased numeric(8,2) not null check(hours_purchased>0),
 hours_spent numeric(8,2) not null default 0 check(hours_spent>=0),
 purchased_at timestamptz not null,
 expires_at timestamptz not null,
 expired_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists studio_pass_customer_expiry on public.studio_pass_purchases(customer_id,expires_at);
alter table public.studio_pass_purchases enable row level security;
-- No direct client access: use service-role for payment and server-only SQL functions.

-- A negative ledger entry consumes the earliest active pass before ordinary credit.
-- Operations occur inside the same transaction as a booking debit.
create or replace function public.track_studio_pass_debit() returns trigger
language plpgsql security definer set search_path=public as $$
declare p record; remaining numeric(8,2); allocated numeric(8,2);
begin
 if new.hours_delta>=0 or new.note like 'Studio Pass expired%' then return new; end if;
 remaining := -new.hours_delta;
 for p in select * from public.studio_pass_purchases
   where customer_id=new.customer_id and expired_at is null and expires_at>now() and hours_spent<hours_purchased
   order by expires_at,purchased_at for update loop
   exit when remaining<=0;
   allocated:=least(remaining,p.hours_purchased-p.hours_spent);
   update public.studio_pass_purchases set hours_spent=hours_spent+allocated where payment_id=p.payment_id;
   remaining:=remaining-allocated;
 end loop;
 return new;
end;$$;
drop trigger if exists studio_pass_track_credit_debit on public.credit_ledger;
create trigger studio_pass_track_credit_debit after insert on public.credit_ledger
for each row execute function public.track_studio_pass_debit();

-- Lazy expiry: invoked under advisory lock at credit booking, and on authenticated portal reads.
create or replace function public.expire_studio_passes(p_customer_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare p record; remaining numeric(8,2);
begin
 perform pg_advisory_xact_lock(hashtext('credits:'||p_customer_id::text));
 for p in select * from public.studio_pass_purchases
    where customer_id=p_customer_id and expired_at is null and expires_at<=now()
    order by expires_at for update loop
   remaining := greatest(0,p.hours_purchased-p.hours_spent);
   if remaining>0 then
     insert into public.credit_ledger(customer_id,payment_id,hours_delta,note)
       values(p_customer_id,p.payment_id,-remaining,'Studio Pass expired · 30-day validity');
   end if;
   update public.studio_pass_purchases set expired_at=now() where payment_id=p.payment_id;
 end loop;
end;$$;
revoke all on function public.expire_studio_passes(uuid) from public,anon,authenticated;

-- Enforce session date is within expiry for pass-funded bookings.
-- Requires a pass sufficiently funded after expiry cleanup; ordinary credit remains usable.
create or replace function public.studio_pass_booking_date_check(p_customer_id uuid,p_date date,p_hours numeric)
returns boolean language plpgsql security definer set search_path=public as $$
declare all_credit numeric(8,2); future_pass numeric(8,2);
begin
 perform public.expire_studio_passes(p_customer_id);
 select coalesce(sum(hours_delta),0) into all_credit from public.credit_ledger where customer_id=p_customer_id;
 select coalesce(sum(hours_purchased-hours_spent),0) into future_pass
 from public.studio_pass_purchases where customer_id=p_customer_id and expired_at is null
 and expires_at <= (p_date::timestamp at time zone 'Europe/London');
 -- Future date cannot rely on pass credit expiring before that session.
 return all_credit-future_pass>=p_hours;
end;$$;
revoke all on function public.studio_pass_booking_date_check(uuid,date,numeric) from public,anon,authenticated;

-- Install updated credit-booking RPC after helpers:
create or replace function public.reserve_credit_booking(
  p_customer_id uuid,p_service_slug text,p_service_name text,p_booking_date date,p_start_time time,p_end_time time,
  p_duration_minutes integer,p_genre text,p_notes text,p_amount_pence integer,p_harmful_music_policy_accepted boolean default true
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;needed_hours numeric(8,2);available_hours numeric(8,2);
begin
  needed_hours:=p_duration_minutes::numeric/60;
  perform pg_advisory_xact_lock(hashtext('credits:'||p_customer_id::text));perform pg_advisory_xact_lock(hashtext(p_booking_date::text));
  if not public.studio_pass_booking_date_check(p_customer_id,p_booking_date,needed_hours) then raise exception 'insufficient_credits'; end if;
  select coalesce(sum(hours_delta),0) into available_hours from public.credit_ledger where customer_id=p_customer_id;
  if available_hours<needed_hours then raise exception 'insufficient_credits'; end if;
  if exists(select 1 from public.blockouts b where b.booking_date=p_booking_date and not (p_service_slug=any(coalesce(b.ignored_service_slugs,'{}'::text[]))) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'slot_unavailable'; end if;
  if exists(select 1 from public.bookings b where b.booking_date=p_booking_date and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and p_start_time<b.end_time and p_end_time>b.start_time) then raise exception 'slot_unavailable'; end if;
  insert into public.bookings(customer_id,service_slug,service_name,booking_date,start_time,end_time,duration_minutes,genre,notes,amount_pence,status,payment_status,hold_expires_at,harmful_music_policy_accepted,policy_accepted_at,payment_method)
  values(p_customer_id,p_service_slug,p_service_name,p_booking_date,p_start_time,p_end_time,p_duration_minutes,p_genre,p_notes,p_amount_pence,'confirmed','paid',null,p_harmful_music_policy_accepted,case when p_harmful_music_policy_accepted then now() else null end,'credits') returning id into new_id;
  insert into public.credit_ledger(customer_id,booking_id,hours_delta,note) values(p_customer_id,new_id,-needed_hours,'Studio hours used for '||p_service_name||' · '||p_booking_date::text);
  return new_id;
end;$$;



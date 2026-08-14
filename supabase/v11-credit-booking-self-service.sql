-- Silkcrayon Studio OS V11 — prepaid-hour booking + customer self-service.
-- Run once AFTER v10-customer-portal.sql.

alter table public.bookings add column if not exists payment_method text not null default 'stripe';
alter table public.bookings add column if not exists customer_rescheduled_at timestamptz;
alter table public.bookings add column if not exists cancellation_requested_at timestamptz;
alter table public.bookings add column if not exists cancellation_request_note text;

alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings add constraint bookings_payment_method_check check (payment_method in ('stripe','credits','manual'));

alter table public.notification_log drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log add constraint notification_log_notification_type_check check (
  notification_type in (
    'booking_confirmation','session_reminder','report_reminder','book_again',
    'owner_new_booking','engineer_assignment','session_followup','package_purchase',
    'credit_booking_confirmation','booking_rescheduled','cancellation_request','owner_cancellation_request'
  )
);

-- Atomically spend prepaid hours and reserve the slot.
create or replace function public.reserve_credit_booking(
  p_customer_id uuid,
  p_service_slug text,
  p_service_name text,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_duration_minutes integer,
  p_genre text,
  p_notes text,
  p_amount_pence integer,
  p_harmful_music_policy_accepted boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  needed_hours numeric(8,2);
  available_hours numeric(8,2);
begin
  needed_hours := p_duration_minutes::numeric / 60;
  perform pg_advisory_xact_lock(hashtext('credits:' || p_customer_id::text));
  perform pg_advisory_xact_lock(hashtext(p_booking_date::text));

  select coalesce(sum(hours_delta),0) into available_hours
  from public.credit_ledger where customer_id=p_customer_id;
  if available_hours < needed_hours then raise exception 'insufficient_credits'; end if;

  if exists (
    select 1 from public.blockouts b where b.booking_date=p_booking_date
      and p_start_time < b.end_time and p_end_time > b.start_time
  ) then raise exception 'slot_unavailable'; end if;

  if exists (
    select 1 from public.bookings b where b.booking_date=p_booking_date
      and b.status in ('pending','confirmed')
      and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
      and p_start_time < b.end_time and p_end_time > b.start_time
  ) then raise exception 'slot_unavailable'; end if;

  insert into public.bookings(
    customer_id,service_slug,service_name,booking_date,start_time,end_time,duration_minutes,
    genre,notes,amount_pence,status,payment_status,hold_expires_at,
    harmful_music_policy_accepted,policy_accepted_at,payment_method
  ) values(
    p_customer_id,p_service_slug,p_service_name,p_booking_date,p_start_time,p_end_time,p_duration_minutes,
    p_genre,p_notes,p_amount_pence,'confirmed','paid',null,
    p_harmful_music_policy_accepted,case when p_harmful_music_policy_accepted then now() else null end,'credits'
  ) returning id into new_id;

  insert into public.credit_ledger(customer_id,booking_id,hours_delta,note)
  values(p_customer_id,new_id,-needed_hours,'Studio hours used for ' || p_service_name || ' · ' || p_booking_date::text);

  return new_id;
end;
$$;

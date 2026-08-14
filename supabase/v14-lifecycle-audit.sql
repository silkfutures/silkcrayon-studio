-- V14 — mobile Studio OS + booking lifecycle/audit trail
-- Run after V13.

alter table public.bookings add column if not exists cancellation_reason_code text;
alter table public.bookings add column if not exists cancellation_reason_note text;
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings add column if not exists cancelled_by_user_id uuid;

alter table public.bookings add column if not exists no_show_at timestamptz;
alter table public.bookings add column if not exists no_show_note text;
alter table public.bookings add column if not exists no_show_by_user_id uuid;

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  customer_id uuid,
  event_type text not null,
  reason_code text,
  note text,
  actor_user_id uuid,
  actor_name text,
  actor_role text,
  snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_booking_idx on public.booking_events(booking_id, created_at desc);
create index if not exists booking_events_customer_idx on public.booking_events(customer_id, created_at desc);
create index if not exists booking_events_created_idx on public.booking_events(created_at desc);

alter table public.notification_log drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log add constraint notification_log_notification_type_check check (
  notification_type in (
    'booking_confirmation','session_reminder','report_reminder','book_again',
    'owner_new_booking','engineer_assignment','session_followup','package_purchase',
    'credit_booking_confirmation','change_request_received','change_request_decision',
    'no_show_followup','booking_cancelled'
  )
);

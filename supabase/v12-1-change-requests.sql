-- V12.1 — customer session change requests
-- Run after V11.
alter table public.bookings add column if not exists change_requested_at timestamptz;
alter table public.bookings add column if not exists change_requested_date date;
alter table public.bookings add column if not exists change_requested_start time;
alter table public.bookings add column if not exists change_requested_end time;
alter table public.bookings add column if not exists change_request_note text;
alter table public.bookings add column if not exists change_request_status text;
alter table public.bookings add column if not exists change_request_resolved_at timestamptz;

create index if not exists bookings_change_request_status_idx
  on public.bookings(change_request_status)
  where change_request_status = 'pending';

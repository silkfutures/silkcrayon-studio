-- Silkcrayon Studio OS V7: automation + analytics.
-- Run once AFTER v5-engineer-app.sql. V6 required no migration.

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  channel text not null default 'email' check (channel in ('email')),
  notification_type text not null check (notification_type in ('booking_confirmation','session_reminder','report_reminder','book_again')),
  recipient text not null,
  subject text,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, notification_type, recipient)
);
create index if not exists notification_log_created_idx on public.notification_log(created_at desc);
create index if not exists notification_log_booking_idx on public.notification_log(booking_id, notification_type);
alter table public.notification_log enable row level security;

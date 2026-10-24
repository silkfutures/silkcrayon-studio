-- Anonymous booking funnel; no customer names, emails, or phone numbers.
-- Execute in Supabase before enabling the new booking-conversion UI.
create table if not exists public.booking_funnel_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('booking_view','service_selected','slot_selected','no_availability','checkout_started','booking_paid')),
  visitor_id text,
  booking_id uuid references public.bookings(id) on delete set null,
  service_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_host text,
  created_at timestamptz not null default now()
);
create index if not exists booking_funnel_created_idx on public.booking_funnel_events(created_at desc);
create index if not exists booking_funnel_event_idx on public.booking_funnel_events(event_name, created_at desc);
create index if not exists booking_funnel_visitor_idx on public.booking_funnel_events(visitor_id, created_at desc);
create unique index if not exists booking_funnel_paid_once on public.booking_funnel_events(booking_id)
  where booking_id is not null and event_name='booking_paid';
alter table public.booking_funnel_events enable row level security;
revoke all on table public.booking_funnel_events from anon, authenticated;
revoke all on sequence public.booking_funnel_events_id_seq from anon, authenticated;

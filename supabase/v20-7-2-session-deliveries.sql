-- V20.7.2 — secure customer session deliveries
create table if not exists public.session_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_by_user_id uuid null,
  delivery_type text not null check (delivery_type in ('upload','link')),
  file_name text null,
  storage_path text null,
  external_url text null,
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint session_delivery_has_target check (storage_path is not null or external_url is not null)
);
create index if not exists session_deliveries_booking_idx on public.session_deliveries(booking_id,created_at desc);
alter table public.session_deliveries enable row level security;

insert into storage.buckets (id,name,public,file_size_limit)
values ('session-deliveries','session-deliveries',false,1073741824)
on conflict (id) do update set public=false,file_size_limit=1073741824;

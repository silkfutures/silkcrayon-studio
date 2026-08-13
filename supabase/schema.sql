create extension if not exists "pgcrypto";

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  artist_name text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_slug text not null,
  service_name text not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  genre text,
  notes text,
  amount_pence integer not null check (amount_pence >= 0),
  currency text not null default 'gbp',
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','no_show')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded','part_refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  hold_expires_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blockouts (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx on public.bookings(booking_date, start_time);
create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists blockouts_date_idx on public.blockouts(booking_date, start_time);

alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.blockouts enable row level security;

-- No public RLS policies on purpose. The app only accesses these tables server-side
-- with SUPABASE_SECRET_KEY. Never expose that key to the browser.

-- Atomic reservation function. This prevents two customers taking overlapping
-- slots at the same moment by locking the requested studio date inside one DB transaction.
create or replace function public.reserve_booking(
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
  p_hold_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_booking_date::text));

  if exists (
    select 1 from public.blockouts b
    where b.booking_date = p_booking_date
      and p_start_time < b.end_time
      and p_end_time > b.start_time
  ) then
    raise exception 'slot_unavailable';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.booking_date = p_booking_date
      and b.status in ('pending','confirmed')
      and (b.status = 'confirmed' or b.hold_expires_at is null or b.hold_expires_at > now())
      and p_start_time < b.end_time
      and p_end_time > b.start_time
  ) then
    raise exception 'slot_unavailable';
  end if;

  insert into public.bookings (
    customer_id, service_slug, service_name, booking_date, start_time, end_time,
    duration_minutes, genre, notes, amount_pence, status, payment_status, hold_expires_at
  ) values (
    p_customer_id, p_service_slug, p_service_name, p_booking_date, p_start_time, p_end_time,
    p_duration_minutes, p_genre, p_notes, p_amount_pence, 'pending', 'unpaid', p_hold_expires_at
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.reserve_booking(uuid,text,text,date,time,time,integer,text,text,integer,timestamptz) from public;

-- V2 operations additions (safe to run after the original schema)
alter table public.bookings add column if not exists policy_accepted boolean not null default false;
alter table public.bookings add column if not exists engineer_name text;
alter table public.bookings add column if not exists engineer_pay_pence integer;
alter table public.customers add column if not exists date_of_birth date;
alter table public.customers add column if not exists area text;
alter table public.customers add column if not exists instagram text;
alter table public.customers add column if not exists preferred_engineer text;
alter table public.customers add column if not exists preferred_genre text;
alter table public.customers add column if not exists goals text;
create table if not exists public.engineer_sessions (
 id uuid primary key default gen_random_uuid(), booking_id uuid references public.bookings(id) on delete set null,
 session_date date not null, artist_name text not null, engineer_name text not null, studio text default 'Silkcrayon',
 start_time time, end_time time, hours numeric(6,2), payment_method text, amount_pence integer default 0,
 engineer_pay_pence integer default 0, tracks_worked_on text, session_notes text, follow_up text, created_at timestamptz default now()
);
create table if not exists public.page_views (
 id bigint generated always as identity primary key, path text not null, referrer text, visitor_id text, created_at timestamptz default now()
);
alter table public.engineer_sessions enable row level security;
alter table public.page_views enable row level security;

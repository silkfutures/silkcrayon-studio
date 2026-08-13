-- Silkcrayon Studio OS V5: engineer app, CRM enrichment, payments and prepaid hours.
-- Run once AFTER v4-auth-roles.sql.

alter table public.customers add column if not exists postcode text;
alter table public.customers add column if not exists marketing_source text;
alter table public.customers add column if not exists harmful_music_policy_accepted boolean not null default false;
alter table public.customers add column if not exists policy_accepted_at timestamptz;
alter table public.customers add column if not exists registered_by_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.studio_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text,
  kind text not null default 'session' check (kind in ('session','package','other')),
  description text not null,
  amount_pence integer not null check (amount_pence > 0),
  hours_credit numeric(8,2) not null default 0 check (hours_credit >= 0),
  status text not null default 'pending' check (status in ('pending','paid','expired','cancelled','refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_payments_customer_idx on public.studio_payments(customer_id, created_at desc);
create index if not exists studio_payments_status_idx on public.studio_payments(status, created_at desc);
alter table public.studio_payments enable row level security;

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  payment_id uuid references public.studio_payments(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  hours_delta numeric(8,2) not null,
  note text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_customer_idx on public.credit_ledger(customer_id, created_at desc);
alter table public.credit_ledger enable row level security;

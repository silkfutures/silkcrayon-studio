-- Run before deploying. Private tables are accessed only by server-side service role.
alter table public.mix_jobs add column if not exists engineer_user_id uuid references auth.users(id) on delete set null;
alter table public.mix_jobs add column if not exists engineer_fee_pence integer not null default 0 check(engineer_fee_pence>=0);
alter table public.mix_jobs add column if not exists extra_revision_price_pence integer not null default 2500 check(extra_revision_price_pence>=100);
alter table public.mix_jobs add column if not exists extra_revisions_paid integer not null default 0 check(extra_revisions_paid>=0);
alter table public.session_deliveries add column if not exists engineer_notes text;
create table if not exists public.mix_engineer_payouts (
 mix_job_id uuid primary key references public.mix_jobs(id) on delete restrict,
 engineer_user_id uuid not null references auth.users(id),
 amount_pence integer not null check(amount_pence>=0),
 status text not null default 'pending' check(status in ('pending','processing','paid','on_hold','needs_approval','failed')),
 stripe_transfer_id text unique,
 error text,
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
alter table public.mix_engineer_payouts enable row level security;
create table if not exists public.mix_extra_revision_orders (
 id uuid primary key default gen_random_uuid(),
 mix_job_id uuid not null references public.mix_jobs(id) on delete restrict,
 checkout_session_id text unique,
 amount_pence integer not null check(amount_pence>=100),
 status text not null default 'pending' check(status in ('pending','paid')),
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.mix_extra_revision_orders enable row level security;
create index if not exists mix_jobs_engineer_idx on public.mix_jobs(engineer_user_id,created_at desc);

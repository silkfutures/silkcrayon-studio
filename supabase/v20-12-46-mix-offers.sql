create table if not exists public.mix_engineer_offers (
 id uuid primary key default gen_random_uuid(),
 mix_job_id uuid not null references public.mix_jobs(id) on delete cascade,
 engineer_user_id uuid not null references auth.users(id),
 fee_pence integer not null check(fee_pence >= 0),
 demo_path text,
 demo_name text,
 notes text,
 status text not null default 'pending' check(status in ('draft','pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 responded_at timestamptz
);
create unique index if not exists mix_one_pending_offer on public.mix_engineer_offers(mix_job_id) where status='pending';
create index if not exists mix_offers_engineer_idx on public.mix_engineer_offers(engineer_user_id,created_at desc);
alter table public.mix_engineer_offers enable row level security;

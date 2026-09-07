-- V20.12.6 — dedicated mixing pipeline, revisions and shared delivery history
create table if not exists public.mix_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  track_title text not null,
  service_type text not null check (service_type in ('mix_only','mix_master','master_only')),
  quoted_amount_pence integer not null default 0 check (quoted_amount_pence >= 0),
  paid_amount_pence integer not null default 0 check (paid_amount_pence >= 0),
  payment_due_date date null,
  paid_at timestamptz null,
  files_received boolean not null default false,
  reference_tracks text null,
  notes text null,
  vocal_tuning_editing boolean not null default false,
  stem_delivery boolean not null default false,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','ready_to_start','mixing','first_mix_sent','revisions','approved','delivered')),
  created_by_user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mix_job_payment_gate check (status = 'awaiting_payment' or paid_amount_pence >= quoted_amount_pence)
);
create index if not exists mix_jobs_status_idx on public.mix_jobs(status, payment_due_date);
create index if not exists mix_jobs_customer_idx on public.mix_jobs(customer_id, created_at desc);

create table if not exists public.mix_revisions (
  id uuid primary key default gen_random_uuid(),
  mix_job_id uuid not null references public.mix_jobs(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  client_notes text null,
  created_by_user_id uuid null,
  created_at timestamptz not null default now(),
  unique (mix_job_id, revision_number)
);

-- Reuse the existing secure file-delivery system. A delivery belongs to either a
-- booked session or a mix job; mix revision is optional for first/final sends.
alter table public.session_deliveries alter column booking_id drop not null;
alter table public.session_deliveries add column if not exists mix_job_id uuid null references public.mix_jobs(id) on delete cascade;
alter table public.session_deliveries add column if not exists mix_revision_id uuid null references public.mix_revisions(id) on delete set null;
alter table public.session_deliveries drop constraint if exists session_deliveries_parent_check;
alter table public.session_deliveries add constraint session_deliveries_parent_check
  check ((booking_id is not null and mix_job_id is null) or (booking_id is null and mix_job_id is not null));
create index if not exists session_deliveries_mix_idx on public.session_deliveries(mix_job_id, created_at desc);

alter table public.mix_jobs enable row level security;
alter table public.mix_revisions enable row level security;

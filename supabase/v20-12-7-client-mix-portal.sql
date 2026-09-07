-- V20.12.7 — website mix requests, quote/payment portal and source uploads
alter table public.mix_jobs drop constraint if exists mix_jobs_status_check;
alter table public.mix_jobs add constraint mix_jobs_status_check check (status in ('needs_quote','quote_sent','awaiting_payment','ready_to_start','mixing','first_mix_sent','revisions','approved','delivered'));
alter table public.mix_jobs drop constraint if exists mix_job_payment_gate;
alter table public.mix_jobs add constraint mix_job_payment_gate check (status in ('needs_quote','quote_sent','awaiting_payment') or paid_amount_pence >= quoted_amount_pence);
alter table public.mix_jobs add column if not exists bpm text null;
alter table public.mix_jobs add column if not exists musical_key text null;
alter table public.mix_jobs add column if not exists genre text null;
alter table public.mix_jobs add column if not exists release_date date null;
alter table public.mix_jobs add column if not exists client_brief text null;
alter table public.mix_jobs add column if not exists turnaround_text text null;
alter table public.mix_jobs add column if not exists included_revisions integer not null default 1;
alter table public.mix_jobs add column if not exists quote_sent_at timestamptz null;
alter table public.mix_jobs add column if not exists quote_accepted_at timestamptz null;
alter table public.mix_jobs add column if not exists stripe_checkout_session_id text null;
alter table public.mix_jobs add column if not exists stripe_payment_intent_id text null;

create table if not exists public.mix_source_files (
 id uuid primary key default gen_random_uuid(), mix_job_id uuid not null references public.mix_jobs(id) on delete cascade,
 customer_id uuid not null references public.customers(id) on delete cascade,
 file_kind text not null check (file_kind in ('stems','rough_mix','reference','other')),
 file_name text not null, storage_path text not null, size_bytes bigint null,
 created_at timestamptz not null default now()
);
create index if not exists mix_source_files_job_idx on public.mix_source_files(mix_job_id,created_at);
alter table public.mix_source_files enable row level security;

-- V20.12 — podcast enquiries + project/quote pipeline
-- Run after V20 leads migrations.

alter table public.leads add column if not exists episode_count integer;
alter table public.leads add column if not exists episode_length_minutes numeric(8,2);
alter table public.leads add column if not exists recording_hours numeric(8,2);
alter table public.leads add column if not exists video_required text;
alter table public.leads add column if not exists target_dates text;
alter table public.leads add column if not exists recurring_project boolean not null default false;

create table if not exists public.studio_projects (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 lead_id uuid references public.leads(id) on delete set null,
 customer_id uuid references public.customers(id) on delete set null,
 title text not null,
 project_type text not null default 'podcast',
 status text not null default 'quoted' check (status in ('quoted','accepted','deposit_due','scheduled','recording','post_production','delivered','lost')),
 contact_name text,
 company_name text,
 email text,
 phone text,
 speaker_count integer,
 episode_count integer,
 episode_length_minutes numeric(8,2),
 recording_hours_included numeric(8,2) not null default 0,
 recording_hours_used numeric(8,2) not null default 0,
 video_required boolean not null default false,
 editing_required boolean,
 quote_amount_pence integer not null default 0,
 recording_amount_pence integer not null default 0,
 post_amount_pence integer not null default 0,
 deposit_amount_pence integer not null default 0,
 target_dates text,
 notes text
);
create index if not exists studio_projects_status_created_idx on public.studio_projects(status,created_at desc);
create unique index if not exists studio_projects_lead_unique_idx on public.studio_projects(lead_id) where lead_id is not null;
alter table public.studio_projects enable row level security;

create table if not exists public.leads (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 enquiry_type text not null,
 client_type text not null default 'client',
 status text not null default 'new' check (status in ('new','contacted','interested','booked','won','lost')),
 full_name text not null,
 artist_or_company text,
 email text not null,
 phone text,
 preferred_call_time text,
 project_type text,
 project_details text,
 budget_range text,
 deadline text,
 word_count_runtime text,
 speakers text,
 editing_required text,
 track_count text,
 stems_available text,
 reference_tracks text,
 source text not null default 'website',
 notes text
);
create index if not exists leads_status_created_idx on public.leads(status,created_at desc);
alter table public.leads enable row level security;

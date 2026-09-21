-- Silkcrayon Studio OS v20.12.36
-- Cached AI call preparation for bookings and enquiries.

create table if not exists public.ai_call_preps (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('booking','enquiry')),
  source_id uuid not null,
  input_hash text not null,
  prompt_version text not null,
  result jsonb not null,
  model text,
  generated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type,source_id)
);

create index if not exists ai_call_preps_source_idx on public.ai_call_preps(source_type,source_id);
alter table public.ai_call_preps enable row level security;

comment on table public.ai_call_preps is 'Server-only cached AI call guides for studio bookings and enquiries.';

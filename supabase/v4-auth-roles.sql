-- Silkcrayon Studio OS V4: staff authentication, roles and assignment.
-- Run once AFTER v3-studio-os.sql.

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  engineer_name text,
  role text not null default 'engineer' check (role in ('owner','engineer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_profiles_role_idx on public.staff_profiles(role, active);
alter table public.staff_profiles enable row level security;

alter table public.bookings add column if not exists engineer_user_id uuid references auth.users(id) on delete set null;
create index if not exists bookings_engineer_user_idx on public.bookings(engineer_user_id, booking_date);

alter table public.session_reports add column if not exists submitted_by_user_id uuid references auth.users(id) on delete set null;
alter table public.session_reports add column if not exists submitted_by_name text;
create index if not exists session_reports_submitter_idx on public.session_reports(submitted_by_user_id, session_date);

-- App reads/writes operational data with the server-only service key.
-- Authentication itself is handled by Supabase Auth cookies.

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

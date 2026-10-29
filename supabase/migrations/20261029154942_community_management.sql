create table if not exists public.community_interests (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 name text not null,
 email text not null,
 instagram text,
 role text not null,
 genres text[] not null default '{}',
 interests text[] not null default '{}',
 availability text[] not null default '{}',
 influences text,
 music_link text,
 marketing_consent boolean not null default false,
 source text not null default 'website'
);
create index if not exists community_interests_created_at_idx on public.community_interests(created_at desc);
create index if not exists community_interests_genres_idx on public.community_interests using gin(genres);
alter table public.community_interests enable row level security;
-- No public policies: submissions are written only through the server's service-role client.

-- Preserve earlier registrations; phone is required by the public API for new ones.
alter table public.community_interests add column if not exists phone text;
alter table public.community_interests add column if not exists status text not null default 'new' check (status in ('new','contacted','invited','attended','archived'));
alter table public.community_interests add column if not exists notes text not null default '';
alter table public.community_interests add column if not exists updated_at timestamptz not null default now();
create index if not exists community_interests_status_idx on public.community_interests(status);
revoke all on public.community_interests from anon, authenticated;
grant select, insert, update, delete on public.community_interests to service_role;

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

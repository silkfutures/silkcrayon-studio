begin;
create table if not exists public.message_activity(
 id uuid primary key default gen_random_uuid(),
 channel text not null check(channel in ('email','sms')),
 recipient text not null,subject text,source text,
 actor_user_id uuid,actor_name text,actor_role text,
 status text not null check(status in ('sending','scheduled','sent','failed','skipped')),
 provider_id text,error text,created_at timestamptz not null default now(),sent_at timestamptz
);
create index if not exists message_activity_created_idx on public.message_activity(created_at desc);
alter table public.message_activity enable row level security;
revoke all on public.message_activity from public,anon,authenticated;
grant select,insert,update on public.message_activity to service_role;
commit;

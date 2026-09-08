-- V20.12.10 — private, multi-calendar Apple availability sync.
create table if not exists public.external_calendars (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  feed_url_encrypted text not null,
  active boolean not null default true,
  block_all_day boolean not null default true,
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes between 0 and 240),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes between 0 and 240),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.external_calendars enable row level security;

alter table public.blockouts add column if not exists external_calendar_id uuid references public.external_calendars(id) on delete cascade;
alter table public.blockouts add column if not exists external_event_key text;
create unique index if not exists blockouts_external_event_idx on public.blockouts(external_calendar_id,external_event_key) where external_calendar_id is not null;

create or replace function public.replace_external_calendar_blockouts(p_source_id uuid,p_blocks jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare inserted_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_source_id::text));
  if not exists(select 1 from public.external_calendars where id=p_source_id) then raise exception 'calendar_not_found'; end if;
  delete from public.blockouts where external_calendar_id=p_source_id;
  insert into public.blockouts(booking_date,start_time,end_time,reason,external_calendar_id,external_event_key)
  select (x->>'booking_date')::date,(x->>'start_time')::time,(x->>'end_time')::time,left(x->>'reason',240),p_source_id,x->>'external_event_key'
  from jsonb_array_elements(coalesce(p_blocks,'[]'::jsonb)) x
  where (x->>'start_time')::time < (x->>'end_time')::time
  on conflict (external_calendar_id,external_event_key) where external_calendar_id is not null do nothing;
  get diagnostics inserted_count=row_count;return inserted_count;
end;$$;
revoke all on function public.replace_external_calendar_blockouts(uuid,jsonb) from public;
grant execute on function public.replace_external_calendar_blockouts(uuid,jsonb) to service_role;

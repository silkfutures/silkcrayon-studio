alter table public.studio_projects add column if not exists quote_template text;
alter table public.studio_projects add column if not exists quote_scope text;
alter table public.studio_projects add column if not exists quote_handover text;
alter table public.studio_projects add column if not exists quote_exclusions text;
alter table public.studio_projects add column if not exists quote_turnaround text;
alter table public.studio_projects add column if not exists quote_revision integer not null default 1;
create table if not exists public.project_quote_emails (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.studio_projects(id) on delete cascade,
 revision integer not null,recipient text not null,status text not null check(status in ('sending','sent','failed')),
 snapshot jsonb not null,provider_id text,error text,created_at timestamptz not null default now(),sent_at timestamptz,
 unique(project_id,revision)
);
alter table public.project_quote_emails enable row level security;
create or replace function public.bump_project_quote_revision() returns trigger language plpgsql set search_path=public as $$
begin
 if (to_jsonb(new)-array['updated_at','status','recording_hours_used','quote_revision']) is distinct from (to_jsonb(old)-array['updated_at','status','recording_hours_used','quote_revision']) then new.quote_revision:=old.quote_revision+1; end if;
 return new;
end;$$;
drop trigger if exists studio_project_quote_revision on public.studio_projects;
create trigger studio_project_quote_revision before update on public.studio_projects for each row execute function public.bump_project_quote_revision();

grant all on public.project_quote_emails to service_role;

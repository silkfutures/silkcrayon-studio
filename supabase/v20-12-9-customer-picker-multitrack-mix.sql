-- V20.12.9 — ordered mix tracks and mix activity history
create table if not exists public.mix_tracks (
 id uuid primary key default gen_random_uuid(), mix_job_id uuid not null references public.mix_jobs(id) on delete cascade,
 position integer not null, title text not null, status text not null default 'pending'
   check (status in ('pending','mixing','first_mix_sent','revisions','approved','delivered')),
 created_at timestamptz not null default now(), unique(mix_job_id,position)
);
insert into public.mix_tracks(mix_job_id,position,title)
select id,1,track_title from public.mix_jobs j
where not exists(select 1 from public.mix_tracks t where t.mix_job_id=j.id);
create index if not exists mix_tracks_job_idx on public.mix_tracks(mix_job_id,position);
alter table public.mix_tracks enable row level security;

create table if not exists public.mix_activity (
 id uuid primary key default gen_random_uuid(), mix_job_id uuid not null references public.mix_jobs(id) on delete cascade,
 event_type text not null, channel text null, status text null, detail text null,
 provider_reference text null, created_by_user_id uuid null, created_at timestamptz not null default now()
);
create index if not exists mix_activity_job_idx on public.mix_activity(mix_job_id,created_at desc);
alter table public.mix_activity enable row level security;

alter table public.mix_jobs add column if not exists payment_method text null;
alter table public.mix_jobs add column if not exists payment_reference text null;

create or replace function public.ensure_mix_job_first_track() returns trigger language plpgsql security definer as $$
begin
 if not exists(select 1 from public.mix_tracks where mix_job_id=new.id) then
  insert into public.mix_tracks(mix_job_id,position,title) values(new.id,0,new.track_title);
 end if;
 return new;
end $$;
drop trigger if exists mix_job_first_track on public.mix_jobs;
create trigger mix_job_first_track after insert on public.mix_jobs for each row execute function public.ensure_mix_job_first_track();

create or replace function public.log_mix_revision_activity() returns trigger language plpgsql security definer as $$
begin
 insert into public.mix_activity(mix_job_id,event_type,channel,status,detail)
 values(new.mix_job_id,'revision_requested','portal','recorded','Revision '||new.revision_number||coalesce(': '||new.client_notes,''));
 return new;
end $$;
drop trigger if exists mix_revision_activity on public.mix_revisions;
create trigger mix_revision_activity after insert on public.mix_revisions for each row execute function public.log_mix_revision_activity();

create or replace function public.log_mix_delivery_activity() returns trigger language plpgsql security definer as $$
begin
 if new.mix_job_id is not null then
  insert into public.mix_activity(mix_job_id,event_type,channel,status,detail,provider_reference)
  values(new.mix_job_id,case when new.mix_revision_id is null then 'mix_delivery_created' else 'revision_delivery_created' end,'file_delivery','sent',coalesce(new.file_name,'External delivery link'),new.id::text);
 end if;
 return new;
end $$;
drop trigger if exists mix_delivery_activity on public.session_deliveries;
create trigger mix_delivery_activity after insert on public.session_deliveries for each row execute function public.log_mix_delivery_activity();

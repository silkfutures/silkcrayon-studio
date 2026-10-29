-- v20.12.55 — Plan a Project enquiries
-- Adds the scoping fields the "Plan a Project" journey collects, plus the
-- enquiry pipeline statuses. All columns are nullable; nothing existing moves.
-- Safe to run more than once.

-- Project scoping
alter table public.leads add column if not exists deliverables text;
alter table public.leads add column if not exists collaborators text;
alter table public.leads add column if not exists instruments text;
alter table public.leads add column if not exists people_count integer;
alter table public.leads add column if not exists session_format text;
alter table public.leads add column if not exists engineer_required text;

-- Budget: total project pot vs what is actually available for studio services
alter table public.leads add column if not exists studio_budget_range text;
alter table public.leads add column if not exists budget_covers text;

comment on column public.leads.deliverables is 'What the client wants to walk away with.';
comment on column public.leads.collaborators is 'Other people involved: session musicians, producer, videographer.';
comment on column public.leads.people_count is 'How many people will be in the room.';
comment on column public.leads.session_format is 'Live together as a band / layered one at a time / a mix of both.';
comment on column public.leads.engineer_required is 'Whether Silkcrayon provides the engineer.';
comment on column public.leads.studio_budget_range is 'Portion of the total budget available for studio services.';
comment on column public.leads.budget_covers is 'What else the total budget must cover (musicians, filming, artwork, PR).';

-- Enquiry pipeline: new -> discussing -> quote_sent -> confirmed, plus lost.
-- Replaces the earlier constraint (new, contacted, interested, booked, won,
-- lost). Every old value stays allowed so no historic row is rewritten; the
-- OS displays contacted/interested as Discussing and booked/won as Confirmed.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new','discussing','quote_sent','confirmed','lost',
                    'contacted','interested','booked','won'));

create index if not exists leads_status_created_idx on public.leads (status, created_at desc);
create index if not exists leads_enquiry_type_idx on public.leads (enquiry_type);

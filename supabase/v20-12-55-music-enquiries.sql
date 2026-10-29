-- v20.12.55 — Music project enquiries
-- Adds the fields a band / artist recording enquiry needs, plus budget context.
-- Safe to run more than once.

alter table public.leads add column if not exists budget_covers text;
alter table public.leads add column if not exists instruments text;
alter table public.leads add column if not exists people_count integer;
alter table public.leads add column if not exists session_format text;
alter table public.leads add column if not exists engineer_required text;

comment on column public.leads.budget_covers is 'Whether the stated budget is studio-only or also covers musicians, filming or other costs.';
comment on column public.leads.people_count is 'How many people will be in the room for a music recording session.';
comment on column public.leads.session_format is 'Live together as a band / layered one at a time / a mix of both.';
comment on column public.leads.engineer_required is 'Whether Silkcrayon provides the engineer.';

-- V20.12.2 — project sessions + clean recording/post-production quote split
-- Run after v20-12-podcast-projects.sql.

alter table public.bookings
  add column if not exists project_id uuid references public.studio_projects(id) on delete set null;

create index if not exists bookings_project_id_idx
  on public.bookings(project_id, booking_date, start_time);

-- Ensure existing project totals are internally consistent.
update public.studio_projects
set quote_amount_pence = coalesce(recording_amount_pence,0) + coalesce(post_amount_pence,0)
where quote_amount_pence is distinct from (coalesce(recording_amount_pence,0) + coalesce(post_amount_pence,0));

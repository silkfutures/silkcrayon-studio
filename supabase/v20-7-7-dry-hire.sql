-- V20.7.7 — record acceptance of dry-hire-specific terms.
alter table public.bookings
  add column if not exists dry_hire_terms_accepted boolean not null default false,
  add column if not exists dry_hire_terms_version text;

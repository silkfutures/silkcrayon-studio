-- Silkcrayon OS V19 — versioned policy acceptance
alter table public.bookings add column if not exists terms_version text;
alter table public.bookings add column if not exists cancellation_policy_version text;
alter table public.bookings add column if not exists harmful_music_policy_version text;
alter table public.bookings add column if not exists privacy_policy_version text;
alter table public.bookings add column if not exists policy_acceptance_ip text;
alter table public.bookings add column if not exists policy_acceptance_user_agent text;

create index if not exists bookings_policy_versions_idx on public.bookings(terms_version, cancellation_policy_version, harmful_music_policy_version);

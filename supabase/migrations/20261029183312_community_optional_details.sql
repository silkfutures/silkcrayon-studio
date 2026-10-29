alter table public.community_interests alter column role drop not null;
alter table public.community_interests add column if not exists instruments text;
alter table public.community_interests add column if not exists pronouns text;
alter table public.community_interests add column if not exists access_needs text;
alter table public.community_interests add column if not exists access_consent_at timestamptz;
-- Existing owner-only server access and RLS remain in force.

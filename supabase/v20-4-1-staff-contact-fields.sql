-- Silkcrayon Studio OS V20.4.1 — editable staff contact details
begin;

alter table public.staff_profiles
  add column if not exists email text,
  add column if not exists phone text;

create index if not exists staff_profiles_email_idx
  on public.staff_profiles(lower(email))
  where email is not null;

commit;

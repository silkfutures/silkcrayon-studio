-- Silkcrayon Studio OS V20.4.3 — staff arrival/contact profile fields
begin;

alter table public.staff_profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists photo_url text;

create index if not exists staff_profiles_email_idx
  on public.staff_profiles(lower(email))
  where email is not null;

-- Seed Nathan's customer-facing details from the supplied launch assets.
-- This does not change the internal full_name used for account ownership.
update public.staff_profiles
set engineer_name='Nathan',
    phone='07577724944',
    photo_url='/images/staff/nathan.webp',
    updated_at=now()
where lower(coalesce(full_name,''))='nathan misra'
   or lower(coalesce(engineer_name,''))='nathan misra';

commit;

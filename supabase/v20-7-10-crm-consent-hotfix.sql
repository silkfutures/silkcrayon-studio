-- Silkcrayon Studio OS V20.7.10
-- Backfill the consent-audit columns expected by manual artist registration.
-- Safe to run even if V20.6 was already applied.

alter table public.crm_contacts
  add column if not exists email_consent_recorded_at timestamptz,
  add column if not exists email_consent_source text,
  add column if not exists sms_consent_recorded_at timestamptz,
  add column if not exists sms_consent_source text;

-- Ask PostgREST/Supabase API to refresh its schema cache immediately.
notify pgrst, 'reload schema';

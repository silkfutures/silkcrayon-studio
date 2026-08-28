-- V20.6 — auditable manual marketing permission
-- Unknown is the default. Only an explicit customer agreement becomes subscribed.
alter table public.crm_contacts
  add column if not exists email_consent_recorded_at timestamptz,
  add column if not exists email_consent_source text,
  add column if not exists sms_consent_recorded_at timestamptz,
  add column if not exists sms_consent_source text;

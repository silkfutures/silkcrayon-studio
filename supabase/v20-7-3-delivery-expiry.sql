-- V20.7.3 — 30-day expiry for Silkcrayon-hosted delivery files
alter table public.session_deliveries
  add column if not exists expires_at timestamptz null,
  add column if not exists deleted_at timestamptz null;

-- Existing uploaded deliveries get a 30-day window from their original delivery date.
update public.session_deliveries
set expires_at = created_at + interval '30 days'
where delivery_type = 'upload' and expires_at is null;

create index if not exists session_deliveries_expiry_idx
  on public.session_deliveries(expires_at)
  where delivery_type = 'upload' and deleted_at is null;

-- Silkcrayon Studio OS V20.7.6 — auditable manual payment corrections
-- Run after V20.7.5.

alter table public.studio_payments add column if not exists voided_at timestamptz;
alter table public.studio_payments add column if not exists voided_by_user_id uuid;
alter table public.studio_payments add column if not exists voided_by_name text;
alter table public.studio_payments add column if not exists void_reason text;

create index if not exists studio_payments_status_paid_at_idx on public.studio_payments(status, paid_at desc);

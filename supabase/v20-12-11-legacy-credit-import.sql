-- V20.12.11 — auditable, idempotent imports from the previous booking system.
alter table public.credit_ledger add column if not exists external_reference text;
alter table public.credit_ledger add column if not exists legacy_amount_pence integer check (legacy_amount_pence is null or legacy_amount_pence >= 0);
create unique index if not exists credit_ledger_external_reference_uidx
on public.credit_ledger(lower(external_reference)) where external_reference is not null;

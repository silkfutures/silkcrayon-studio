-- V13 — payment reconciliation, invoices, refunds and accounting metadata
-- Run after V12.1.
alter table public.bookings add column if not exists stripe_invoice_id text;
alter table public.bookings add column if not exists stripe_invoice_number text;
alter table public.bookings add column if not exists stripe_invoice_url text;
alter table public.bookings add column if not exists stripe_invoice_pdf text;
alter table public.bookings add column if not exists stripe_refund_id text;
alter table public.bookings add column if not exists refunded_amount_pence integer not null default 0;
alter table public.bookings add column if not exists refunded_at timestamptz;

alter table public.studio_payments add column if not exists stripe_invoice_id text;
alter table public.studio_payments add column if not exists stripe_invoice_number text;
alter table public.studio_payments add column if not exists stripe_invoice_url text;
alter table public.studio_payments add column if not exists stripe_invoice_pdf text;
alter table public.studio_payments add column if not exists stripe_refund_id text;
alter table public.studio_payments add column if not exists refunded_amount_pence integer not null default 0;
alter table public.studio_payments add column if not exists refunded_at timestamptz;

create index if not exists bookings_payment_status_idx on public.bookings(payment_status);
create index if not exists bookings_stripe_session_idx on public.bookings(stripe_checkout_session_id);

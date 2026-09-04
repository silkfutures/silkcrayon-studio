-- Silkcrayon Studio OS V20.7.5 — extra session time / external payment ledger
-- Run after V20.7.4.

alter table public.studio_payments add column if not exists payment_method text;
alter table public.studio_payments add column if not exists payment_category text;
alter table public.studio_payments add column if not exists session_report_id uuid references public.session_reports(id) on delete set null;
alter table public.studio_payments add column if not exists session_hours numeric(8,2) not null default 0;

create index if not exists studio_payments_booking_idx on public.studio_payments(booking_id, created_at desc);
create index if not exists studio_payments_session_report_idx on public.studio_payments(session_report_id);
create index if not exists studio_payments_category_idx on public.studio_payments(payment_category, created_at desc);

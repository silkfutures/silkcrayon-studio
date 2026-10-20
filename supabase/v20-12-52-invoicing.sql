-- Silkcrayon Studio OS v20.12.52 — Invoicing: invoice any customer, add past sessions, paid invoices count in revenue.
-- Apply AFTER v20-12-51-quickbooks-import.sql. Safe to re-run.
begin;

create table if not exists public.invoices (
 id uuid primary key default gen_random_uuid(),
 invoice_number text,
 status text not null default 'draft' check (status in ('draft','sent','paid','void')),
 customer_id uuid references public.customers(id) on delete set null,
 bill_to_name text not null,
 bill_to_email text,
 bill_to_address text,
 title text,
 lines jsonb not null default '[]'::jsonb,   -- [{type:'custom'|'booking'|'session', booking_id?, session_report_id?, date, service, description, qty, rate_pence, amount_pence, hours?}]
 total_pence integer not null default 0 check (total_pence >= 0),
 issue_date date not null default (now() at time zone 'Europe/London')::date,
 due_date date,
 notes text,
 pay_token_hash text unique,
 stripe_checkout_session_id text,
 stripe_payment_intent_id text,
 document_id bigint references public.studio_documents(id),
 receipt_document_id bigint references public.studio_documents(id),
 sent_to text, sent_at timestamptz, email_error text,
 paid_at timestamptz,
 paid_via text check (paid_via is null or paid_via in ('stripe','bank_transfer','cash','other')),
 paid_note text,
 marked_paid_by_user_id uuid references auth.users(id) on delete set null,
 voided_at timestamptz,
 created_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists invoices_number_uidx on public.invoices(invoice_number) where invoice_number is not null;
create index if not exists invoices_status_idx on public.invoices(status,issue_date desc);
create index if not exists invoices_customer_idx on public.invoices(customer_id,issue_date desc);
alter table public.invoices enable row level security;
revoke all on public.invoices from anon,authenticated;
grant all on public.invoices to service_role;

-- A booking or logged session can sit on only one live invoice at a time (never billed twice).
alter table public.bookings add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
alter table public.session_reports add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
create index if not exists bookings_invoice_idx on public.bookings(invoice_id) where invoice_id is not null;
create index if not exists session_reports_invoice_idx on public.session_reports(invoice_id) where invoice_id is not null;

-- Payments recorded from an invoice (custom lines / logged sessions) point back to it.
alter table public.studio_payments add column if not exists invoice_id uuid references public.invoices(id) on delete set null;
create index if not exists studio_payments_invoice_idx on public.studio_payments(invoice_id) where invoice_id is not null;

-- Documents for general invoices
alter table public.studio_documents drop constraint if exists studio_documents_source_type_check;
alter table public.studio_documents add constraint studio_documents_source_type_check check (source_type in ('booking','project','invoice'));

commit;

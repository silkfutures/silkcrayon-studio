-- Silkcrayon Studio OS v20.12.48 — "Invoice this quote": deposit / balance / full invoices for projects.
-- Apply AFTER v20-12-47. Safe to re-run.
begin;

create table if not exists public.project_invoices (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.studio_projects(id) on delete cascade,
 stage text not null check (stage in ('deposit','balance','full','custom')),
 description text not null,
 amount_pence integer not null check (amount_pence >= 30),
 quote_total_pence integer not null default 0,
 quote_revision integer,
 status text not null default 'sent' check (status in ('sent','paid','void')),
 due_date date,
 pay_token_hash text unique,
 studio_payment_id uuid unique references public.studio_payments(id) on delete set null,
 document_id bigint references public.studio_documents(id),
 receipt_document_id bigint references public.studio_documents(id),
 sent_to text,
 sent_at timestamptz,
 email_error text,
 paid_at timestamptz,
 paid_via text check (paid_via is null or paid_via in ('stripe','bank_transfer','cash','other')),
 paid_note text,
 marked_paid_by_user_id uuid references auth.users(id) on delete set null,
 voided_at timestamptz,
 created_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- One unpaid invoice per project at a time, so a customer is never billed twice for the same money.
create unique index if not exists project_invoices_one_open_uidx on public.project_invoices(project_id) where status='sent';
create index if not exists project_invoices_project_idx on public.project_invoices(project_id,created_at);
alter table public.project_invoices enable row level security;
revoke all on public.project_invoices from anon,authenticated;
grant all on public.project_invoices to service_role;

-- Bank details printed on invoices (edit in Settings).
insert into public.studio_settings(key,value) values
 ('invoice_bank_account_name',''),('invoice_bank_sort_code',''),('invoice_bank_account_number',''),('invoice_payment_terms_days','7')
on conflict (key) do nothing;

commit;

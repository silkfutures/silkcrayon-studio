-- Silkcrayon Studio OS v20.12.51 — QuickBooks switch-over: customer import, invoice archive, continued invoice numbering.
-- Apply AFTER v20-12-48-project-invoices.sql. Safe to re-run.
begin;

-- QuickBooks customer list (keeps the QuickBooks display name so imported invoices can be linked to the artist).
create table if not exists public.quickbooks_customers (
 id uuid primary key default gen_random_uuid(),
 display_name text not null,
 display_key text not null unique,
 company text, email text, phone text, billing_address text,
 customer_id uuid references public.customers(id) on delete set null,
 raw jsonb, imported_at timestamptz not null default now()
);
create index if not exists quickbooks_customers_customer_idx on public.quickbooks_customers(customer_id);

-- Archive of past QuickBooks invoices and sales receipts (kept for your records; not added to OS revenue totals).
create table if not exists public.quickbooks_invoices (
 id uuid primary key default gen_random_uuid(),
 qb_number text not null,
 txn_type text not null default 'Invoice',
 customer_name text,
 customer_email text,
 customer_id uuid references public.customers(id) on delete set null,
 invoice_date date,
 due_date date,
 amount_pence integer not null default 0,
 balance_pence integer not null default 0,
 -- QuickBooks never recorded payment against most invoices, so status starts as 'unrecorded' and you can tidy it in the OS.
 status text not null default 'unrecorded' check (status in ('paid','unpaid','unrecorded','void')),
 status_updated_at timestamptz,
 memo text,
 lines jsonb not null default '[]'::jsonb,
 raw jsonb,
 imported_at timestamptz not null default now(),
 unique (txn_type,qb_number)
);
create index if not exists quickbooks_invoices_customer_idx on public.quickbooks_invoices(customer_id,invoice_date desc);
create index if not exists quickbooks_invoices_date_idx on public.quickbooks_invoices(invoice_date desc);
alter table public.quickbooks_customers enable row level security;
alter table public.quickbooks_invoices enable row level security;
revoke all on public.quickbooks_customers, public.quickbooks_invoices from anon,authenticated;
grant all on public.quickbooks_customers, public.quickbooks_invoices to service_role;

-- Continued invoice numbering (e.g. 1119, 1120 …) for invoices and receipts.
create sequence if not exists public.invoice_number_seq;
alter table public.studio_documents add column if not exists display_number text;
create index if not exists studio_documents_display_number_idx on public.studio_documents(display_number) where display_number is not null;
alter table public.project_invoices add column if not exists invoice_number text;

create or replace function public.next_invoice_number() returns bigint language sql security definer set search_path=public as $$ select nextval('public.invoice_number_seq'); $$;

-- Set the next number. Refuses anything that could repeat a number already used here or in QuickBooks.
create or replace function public.set_next_invoice_number(p_next bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare used bigint;
begin
 if p_next is null or p_next<1 then raise exception 'invalid_number'; end if;
 select greatest(
  coalesce((select max(display_number::bigint) from public.studio_documents where display_number ~ '^[0-9]{1,15}$'),0),
  coalesce((select max(qb_number::bigint) from public.quickbooks_invoices where txn_type='Invoice' and qb_number ~ '^[0-9]{1,15}$'),0)
 ) into used;
 if p_next<=used then raise exception 'number_in_use:%',used; end if;
 perform setval('public.invoice_number_seq',p_next,false);
 insert into public.studio_settings(key,value) values ('invoice_numbering_mode','sequential')
  on conflict (key) do update set value='sequential',updated_at=now();
 return p_next;
end $$;
revoke all on function public.next_invoice_number() from public,anon,authenticated;
revoke all on function public.set_next_invoice_number(bigint) from public,anon,authenticated;
grant execute on function public.next_invoice_number() to service_role;
grant execute on function public.set_next_invoice_number(bigint) to service_role;

commit;

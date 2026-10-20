-- Silkcrayon Studio OS v20.12.53 — Companies (saved billing contacts) for Invoicing.
-- Apply AFTER v20-12-52-invoicing.sql. Safe to re-run.
begin;

create table if not exists public.billing_contacts (
 id uuid primary key default gen_random_uuid(),
 name text not null,                 -- company / organisation name
 name_key text generated always as (lower(regexp_replace(trim(name),'\s+',' ','g'))) stored,
 contact_name text,                  -- printed as "FAO …"
 email text,                         -- where invoices are sent
 phone text,
 address text,                       -- billing address, one line per row
 notes text,
 archived boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists billing_contacts_name_uidx on public.billing_contacts(name_key) where not archived;
alter table public.billing_contacts enable row level security;
revoke all on public.billing_contacts from anon,authenticated;
grant all on public.billing_contacts to service_role;

-- Who pays (company) is separate from whose sessions are on the invoice (customer_id = artist).
alter table public.invoices add column if not exists billing_contact_id uuid references public.billing_contacts(id) on delete set null;
create index if not exists invoices_billing_contact_idx on public.invoices(billing_contact_id,issue_date desc);

-- Seed from QuickBooks customers that have a billing address (organisations you invoice).
do $$
begin
 if to_regclass('public.quickbooks_customers') is not null then
  insert into public.billing_contacts(name,email,address,notes)
  select qc.display_name,qc.email,regexp_replace(qc.billing_address,E'\r','','g'),'Imported from QuickBooks'
  from public.quickbooks_customers qc
  where qc.billing_address is not null
   and not exists (select 1 from public.billing_contacts b where b.name_key=qc.display_key and not b.archived);
 end if;
end $$;

commit;

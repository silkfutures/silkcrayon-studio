-- Silkcrayon Studio OS V20.7.11
-- Dry-hire lead-hirer ID verification.
-- Private temporary document storage; verified documents are deleted immediately.

begin;

alter table public.customers
  add column if not exists dry_hire_id_verified_at timestamptz,
  add column if not exists dry_hire_id_verified_by uuid,
  add column if not exists dry_hire_id_verified_method text,
  add column if not exists dry_hire_id_document_type text;

alter table public.bookings
  add column if not exists dry_hire_lead_hirer_18_confirmed boolean not null default false;

-- Current Studio OS records the actual manual channel on bookings and uses a
-- sentinel when an owner voids an incorrectly-marked manual payment. Older
-- installs still have the V11 three-value check, so widen it safely here.
alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings add constraint bookings_payment_method_check
  check (payment_method in ('stripe','credits','manual','bank_transfer','cash','other','manual_voided'));

create table if not exists public.dry_hire_id_checks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','submitted','verified','rejected','expired')),
  token_hash text not null unique,
  requested_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count >= 1),
  expires_at timestamptz not null,
  request_email_sent_at timestamptz,
  request_sms_sent_at timestamptz,
  request_email_error text,
  request_sms_error text,
  age_18_confirmed_at timestamptz,
  document_type text check (document_type in ('driving_licence','passport')),
  storage_path text,
  original_file_name text,
  mime_type text,
  size_bytes integer check (size_bytes is null or (size_bytes > 0 and size_bytes <= 8388608)),
  submitted_at timestamptz,
  document_expires_at timestamptz,
  verified_at timestamptz,
  verified_by_user_id uuid,
  verification_method text check (verification_method is null or verification_method in ('upload','in_person')),
  rejected_at timestamptz,
  rejection_reason text,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists dry_hire_id_checks_booking_idx on public.dry_hire_id_checks(booking_id,requested_at desc);
create index if not exists dry_hire_id_checks_customer_idx on public.dry_hire_id_checks(customer_id,requested_at desc);
create index if not exists dry_hire_id_checks_cleanup_idx on public.dry_hire_id_checks(status,document_expires_at) where storage_path is not null and deleted_at is null;

alter table public.dry_hire_id_checks enable row level security;
-- Deliberately no client policies: only service-role server routes may read/write the table.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'dry-hire-id',
  'dry-hire-id',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=8388608,
  allowed_mime_types=excluded.allowed_mime_types;

notify pgrst, 'reload schema';
commit;

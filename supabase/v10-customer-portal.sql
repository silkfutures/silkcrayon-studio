-- Silkcrayon Studio OS V10 — customer portal and passwordless secure access.
-- Run once AFTER v9-customer-journey.sql.
create table if not exists public.customer_access_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists customer_access_tokens_customer_idx on public.customer_access_tokens(customer_id,created_at desc);
create index if not exists customer_access_tokens_expiry_idx on public.customer_access_tokens(expires_at);
alter table public.customer_access_tokens enable row level security;

create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists customer_sessions_customer_idx on public.customer_sessions(customer_id,created_at desc);
create index if not exists customer_sessions_expiry_idx on public.customer_sessions(expires_at);
alter table public.customer_sessions enable row level security;

alter table public.notification_log drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log add constraint notification_log_notification_type_check check (
  notification_type in ('booking_confirmation','session_reminder','report_reminder','book_again','owner_new_booking','engineer_assignment','session_followup','package_purchase')
);

-- Silkcrayon Studio OS v20.12.42 — engineer session offers + automatic engineer payouts.
-- Apply AFTER v20-12-41-pdf-documents.sql and BEFORE deploying the v20.12.42 code.
-- Safe to re-run.
begin;

-- 1. Engineer pay (kept separate from customer pricing) + Stripe Connect payout setup
alter table public.staff_profiles add column if not exists engineer_pay_hourly_pence integer check (engineer_pay_hourly_pence is null or engineer_pay_hourly_pence between 0 and 100000);
alter table public.staff_profiles add column if not exists engineer_supported_pay_hourly_pence integer check (engineer_supported_pay_hourly_pence is null or engineer_supported_pay_hourly_pence between 0 and 100000);
alter table public.staff_profiles add column if not exists stripe_connect_account_id text;
alter table public.staff_profiles add column if not exists stripe_transfers_active boolean not null default false;
alter table public.staff_profiles add column if not exists stripe_payouts_enabled boolean not null default false;
alter table public.staff_profiles add column if not exists stripe_details_submitted boolean not null default false;
alter table public.staff_profiles add column if not exists stripe_connect_updated_at timestamptz;
create unique index if not exists staff_profiles_connect_account_uidx on public.staff_profiles(stripe_connect_account_id) where stripe_connect_account_id is not null;

-- 2. Booking-level offer state and the agreed engineer fee snapshot
alter table public.bookings add column if not exists engineer_offer_status text;
alter table public.bookings drop constraint if exists bookings_engineer_offer_status_check;
alter table public.bookings add constraint bookings_engineer_offer_status_check check (engineer_offer_status is null or engineer_offer_status in ('awaiting','accepted','assigned','needs_owner','unfilled'));
alter table public.bookings add column if not exists engineer_accepted_at timestamptz;
alter table public.bookings add column if not exists engineer_pay_hourly_pence integer;
alter table public.bookings add column if not exists engineer_fee_pence integer;
alter table public.bookings add column if not exists engineer_offer_alert_sent_at timestamptz;

-- 3. "Did anything go wrong?" on the Complete session report
alter table public.session_reports add column if not exists issues_flagged boolean not null default false;
alter table public.session_reports add column if not exists issues_note text;

-- 4. Offer queue / history (one row per engineer per round)
create table if not exists public.engineer_session_offers (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 engineer_user_id uuid not null references auth.users(id) on delete cascade,
 engineer_name text,
 position integer not null default 1,
 status text not null default 'queued' check (status in ('queued','sent','accepted','declined','expired','cancelled')),
 requires_owner_approval boolean not null default false,
 owner_approved_at timestamptz,
 window_hours numeric(6,2),
 token_hash text,
 sent_at timestamptz,
 expires_at timestamptz,
 responded_at timestamptz,
 response_via text,
 decline_reason text,
 close_reason text,
 pay_hourly_pence integer,
 fee_pence integer,
 booking_date date,
 start_time time,
 end_time time,
 email_error text,
 created_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists engineer_offers_token_uidx on public.engineer_session_offers(token_hash) where token_hash is not null;
create unique index if not exists engineer_offers_one_live_uidx on public.engineer_session_offers(booking_id) where status='sent';
create unique index if not exists engineer_offers_one_accepted_uidx on public.engineer_session_offers(booking_id) where status='accepted';
create index if not exists engineer_offers_booking_idx on public.engineer_session_offers(booking_id,position);
create index if not exists engineer_offers_due_idx on public.engineer_session_offers(expires_at) where status='sent';
create index if not exists engineer_offers_engineer_idx on public.engineer_session_offers(engineer_user_id,status);
alter table public.engineer_session_offers enable row level security;
revoke all on public.engineer_session_offers from anon,authenticated;
grant all on public.engineer_session_offers to service_role;

-- 5. Engineer payouts ledger
create table if not exists public.engineer_payouts (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid references public.bookings(id) on delete set null,
 session_report_id uuid references public.session_reports(id) on delete set null,
 engineer_user_id uuid not null references auth.users(id) on delete restrict,
 engineer_name text,
 kind text not null default 'session' check (kind in ('session','extra_time','manual')),
 hours numeric(6,2),
 hourly_pence integer,
 amount_pence integer not null default 0 check (amount_pence >= 0),
 status text not null default 'pending' check (status in ('pending','needs_approval','on_hold','processing','paid','failed','cancelled')),
 note text,
 release_after timestamptz not null default now(),
 attempts integer not null default 0,
 next_attempt_at timestamptz,
 last_error text,
 owner_alerted_at timestamptz,
 engineer_setup_nudged_at timestamptz,
 stripe_transfer_id text,
 stripe_destination text,
 paid_at timestamptz,
 approved_by_user_id uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- A session can never produce two live payouts of the same kind.
create unique index if not exists engineer_payouts_one_per_kind_uidx on public.engineer_payouts(booking_id,kind) where booking_id is not null and kind<>'manual' and status<>'cancelled';
create unique index if not exists engineer_payouts_transfer_uidx on public.engineer_payouts(stripe_transfer_id) where stripe_transfer_id is not null;
create index if not exists engineer_payouts_due_idx on public.engineer_payouts(status,release_after,next_attempt_at);
create index if not exists engineer_payouts_engineer_idx on public.engineer_payouts(engineer_user_id,created_at desc);
alter table public.engineer_payouts enable row level security;
revoke all on public.engineer_payouts from anon,authenticated;
grant all on public.engineer_payouts to service_role;

-- 6. Offer windows + automatic payout switch (editable in Settings)
insert into public.studio_settings(key,value) values
 ('engineer_offer_window_hours','12'),
 ('engineer_offer_urgent_window_hours','2'),
 ('engineer_offer_urgent_threshold_hours','48'),
 ('engineer_offer_cutoff_hours','2'),
 ('engineer_auto_payouts','true')
on conflict (key) do nothing;

-- 7. Atomic acceptance: first valid "accept" wins, everything else closes.
create or replace function public.accept_engineer_offer(p_offer_id uuid,p_engineer_user_id uuid,p_via text default 'email')
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.engineer_session_offers; b public.bookings; eng_name text;
begin
 select * into o from public.engineer_session_offers where id=p_offer_id for update;
 if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
 if o.engineer_user_id is distinct from p_engineer_user_id then return jsonb_build_object('ok',false,'reason','not_yours'); end if;
 if o.status<>'sent' then return jsonb_build_object('ok',false,'reason','closed','status',o.status); end if;
 select * into b from public.bookings where id=o.booking_id for update;
 if o.expires_at is not null and o.expires_at<=now() then
  update public.engineer_session_offers set status='expired',close_reason='Response window ended',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','expired');
 end if;
 if b.status not in ('pending','confirmed') then
  update public.engineer_session_offers set status='cancelled',close_reason='Booking no longer active',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','booking_inactive');
 end if;
 if o.booking_date is distinct from b.booking_date or o.start_time is distinct from b.start_time or o.end_time is distinct from b.end_time then
  update public.engineer_session_offers set status='cancelled',close_reason='Booking time changed after the offer was sent',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','booking_changed');
 end if;
 if b.engineer_user_id is not null and b.engineer_user_id<>o.engineer_user_id then
  update public.engineer_session_offers set status='cancelled',close_reason='Another engineer was assigned',updated_at=now() where id=o.id;
  return jsonb_build_object('ok',false,'reason','already_assigned');
 end if;
 select coalesce(engineer_name,full_name) into eng_name from public.staff_profiles where user_id=o.engineer_user_id and active;
 if eng_name is null then return jsonb_build_object('ok',false,'reason','engineer_inactive'); end if;
 update public.engineer_session_offers set status='accepted',responded_at=now(),response_via=p_via,updated_at=now() where id=o.id;
 update public.engineer_session_offers set status='cancelled',close_reason='Session accepted by '||eng_name,updated_at=now()
  where booking_id=o.booking_id and id<>o.id and status in ('queued','sent');
 update public.bookings set engineer_user_id=o.engineer_user_id,assigned_engineer=eng_name,engineer_offer_status='accepted',
  engineer_accepted_at=now(),engineer_pay_hourly_pence=o.pay_hourly_pence,engineer_fee_pence=o.fee_pence,updated_at=now()
  where id=o.booking_id;
 return jsonb_build_object('ok',true,'booking_id',o.booking_id);
end $$;
revoke all on function public.accept_engineer_offer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_engineer_offer(uuid,uuid,text) to service_role;

commit;

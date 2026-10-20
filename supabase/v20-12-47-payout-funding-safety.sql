-- Silkcrayon Studio OS v20.12.47 — off-Stripe payouts wait for the owner; "paid outside Stripe" closes a payout for good.
-- Apply AFTER v20-12-43-offer-fees-dry-hire-access.sql. Safe to re-run.
begin;

-- card      = funded by the customer's own Stripe card payment for that booking (pays automatically)
-- off_stripe = cash / bank transfer / prepaid hours / extra time: needs the owner to choose how to pay
alter table public.engineer_payouts add column if not exists funding_source text not null default 'card';
alter table public.engineer_payouts drop constraint if exists engineer_payouts_funding_source_check;
alter table public.engineer_payouts add constraint engineer_payouts_funding_source_check check (funding_source in ('card','off_stripe'));
alter table public.engineer_payouts add column if not exists paid_via text;
alter table public.engineer_payouts drop constraint if exists engineer_payouts_paid_via_check;
alter table public.engineer_payouts add constraint engineer_payouts_paid_via_check check (paid_via is null or paid_via in ('stripe','outside_stripe'));
alter table public.engineer_payouts add column if not exists paid_outside_note text;
alter table public.engineer_payouts add column if not exists marked_paid_by_user_id uuid references auth.users(id) on delete set null;

update public.engineer_payouts set paid_via='stripe' where status='paid' and paid_via is null and stripe_transfer_id is not null;

-- Existing unpaid payouts that are not backed by a paid Stripe card payment: hold them for the owner.
update public.engineer_payouts p set funding_source='off_stripe'
 from public.bookings b
 where p.booking_id=b.id and p.status in ('pending','failed','on_hold','needs_approval')
 and (p.kind<>'session' or b.stripe_payment_intent_id is null or b.payment_status not in ('paid','part_refunded') or coalesce(b.payment_method,'')<>'stripe');
update public.engineer_payouts set funding_source='off_stripe' where booking_id is null and status in ('pending','failed','on_hold','needs_approval');
update public.engineer_payouts set status='needs_approval',next_attempt_at=null,
 note=trim(coalesce(note,'')||' Customer didn’t pay this session by card through Stripe — choose Pay via Stripe or Mark as paid outside Stripe.')
 where funding_source='off_stripe' and approved_at is null and status in ('pending','failed','on_hold');

commit;

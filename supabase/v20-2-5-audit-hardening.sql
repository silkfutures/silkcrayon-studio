-- Silkcrayon Studio OS V20.2.5 audit hardening
begin;

-- SMS and current notification types must be accepted by the live schema.
alter table public.notification_log drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log add constraint notification_log_notification_type_check check (
  notification_type in (
    'booking_confirmation','booking_confirmation_sms','session_reminder','session_reminder_sms',
    'report_reminder','book_again','owner_new_booking','engineer_assignment','session_followup',
    'package_purchase','credit_booking_confirmation','change_request_received','change_request_decision',
    'no_show_followup','booking_cancelled'
  )
);

alter table public.notification_log drop constraint if exists notification_log_channel_check;
alter table public.notification_log add constraint notification_log_channel_check check (channel in ('email','sms'));

-- One positive package fulfilment per studio payment. Prevents webhook retries double-crediting hours.
create unique index if not exists credit_ledger_positive_payment_uidx
on public.credit_ledger(payment_id)
where payment_id is not null and hours_delta > 0;

create table if not exists public.refund_operations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  stripe_refund_id text not null unique,
  amount_pence integer not null check (amount_pence > 0),
  created_at timestamptz not null default now()
);
create index if not exists refund_operations_booking_idx on public.refund_operations(booking_id,created_at desc);
alter table public.refund_operations enable row level security;

create or replace function public.apply_booking_refund(
  p_booking_id uuid,
  p_stripe_refund_id text,
  p_amount_pence integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b public.bookings%rowtype;
  v_total integer;
  v_full boolean;
begin
  if p_amount_pence is null or p_amount_pence < 1 then raise exception 'invalid_refund_amount'; end if;

  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;

  -- A Stripe refund already recorded is a successful idempotent retry.
  if exists(select 1 from public.refund_operations where stripe_refund_id=p_stripe_refund_id) then
    return jsonb_build_object('ok',true,'duplicate',true,'refunded_amount_pence',coalesce(b.refunded_amount_pence,0));
  end if;

  if coalesce(b.refunded_amount_pence,0)+p_amount_pence > coalesce(b.amount_pence,0) then
    raise exception 'refund_exceeds_remaining';
  end if;

  insert into public.refund_operations(booking_id,stripe_refund_id,amount_pence)
  values(p_booking_id,p_stripe_refund_id,p_amount_pence);

  v_total:=coalesce(b.refunded_amount_pence,0)+p_amount_pence;
  v_full:=v_total>=coalesce(b.amount_pence,0);

  update public.bookings set
    stripe_refund_id=p_stripe_refund_id,
    refunded_amount_pence=v_total,
    refunded_at=now(),
    payment_status=case when v_full then 'refunded' else 'part_refunded' end,
    status=case when v_full then 'cancelled' else status end,
    updated_at=now()
  where id=p_booking_id;

  return jsonb_build_object('ok',true,'duplicate',false,'refunded_amount_pence',v_total,'full',v_full);
end;
$$;
revoke all on function public.apply_booking_refund(uuid,text,integer) from public,anon,authenticated;

commit;

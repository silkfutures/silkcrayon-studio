-- Silkcrayon Studio OS V20.12.17
-- Deposit / part-paid bookings + scheduled balance reminders + external (Monzo) payment links.
-- Run once after the existing V20 migrations.

begin;

alter table public.bookings
  add column if not exists amount_paid_pence integer not null default 0,
  add column if not exists balance_payment_url text,
  add column if not exists balance_payment_provider text,
  add column if not exists balance_reminder_date date,
  add column if not exists balance_reminder_sent_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_amount_paid_pence_check;

alter table public.bookings
  add constraint bookings_amount_paid_pence_check
  check (amount_paid_pence >= 0 and amount_paid_pence <= amount_pence);


alter table public.bookings
  drop constraint if exists bookings_payment_method_check;

alter table public.bookings
  add constraint bookings_payment_method_check
  check (payment_method in ('stripe','credits','manual','bank_transfer','cash','external_card','other','manual_voided'));

create index if not exists bookings_balance_reminder_idx
  on public.bookings(balance_reminder_date, payment_status)
  where balance_reminder_date is not null and balance_reminder_sent_at is null;

-- Deposit / balance are accounting categories only; studio_payments.payment_category
-- is intentionally free text in the current schema.

alter table public.notification_log
  drop constraint if exists notification_log_notification_type_check;

alter table public.notification_log
  add constraint notification_log_notification_type_check check (
    notification_type in (
      'booking_confirmation','booking_confirmation_sms','session_reminder','session_reminder_sms',
      'report_reminder','book_again','owner_new_booking','engineer_assignment','session_followup',
      'package_purchase','credit_booking_confirmation','change_request_received','change_request_decision',
      'no_show_followup','booking_cancelled','admin_booking_confirmation','admin_booking_confirmation_sms',
      'manual_booking_payment_link','manual_booking_payment_link_sms','files_ready_email','files_ready_sms',
      'balance_payment_reminder','balance_payment_reminder_sms'
    )
  );

commit;

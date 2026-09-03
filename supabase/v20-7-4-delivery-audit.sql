-- V20.7.4 — file-delivery notification audit + first-download tracking
begin;

alter table public.session_deliveries
  add column if not exists first_downloaded_at timestamptz null,
  add column if not exists last_downloaded_at timestamptz null,
  add column if not exists download_count integer not null default 0;

alter table public.notification_log
  add column if not exists session_delivery_id uuid null references public.session_deliveries(id) on delete set null;

-- The original notification log only allowed one row per booking/type/recipient.
-- Deliveries can legitimately be re-sent for the same booking, so delivery messages
-- are made unique per delivery while all existing notification behaviour stays unique.
alter table public.notification_log
  drop constraint if exists notification_log_booking_id_notification_type_recipient_key;

create unique index if not exists notification_log_standard_unique_idx
  on public.notification_log(booking_id,notification_type,recipient)
  where session_delivery_id is null;

create unique index if not exists notification_log_delivery_unique_idx
  on public.notification_log(session_delivery_id,notification_type,recipient)
  where session_delivery_id is not null;

alter table public.notification_log
  drop constraint if exists notification_log_notification_type_check;

alter table public.notification_log
  add constraint notification_log_notification_type_check check (
    notification_type in (
      'booking_confirmation','booking_confirmation_sms','session_reminder','session_reminder_sms',
      'report_reminder','book_again','owner_new_booking','engineer_assignment','session_followup',
      'package_purchase','credit_booking_confirmation','change_request_received','change_request_decision',
      'no_show_followup','booking_cancelled','admin_booking_confirmation','admin_booking_confirmation_sms',
      'manual_booking_payment_link','manual_booking_payment_link_sms','files_ready_email','files_ready_sms'
    )
  );

create index if not exists notification_log_delivery_idx on public.notification_log(session_delivery_id,created_at desc);
create index if not exists session_deliveries_download_idx on public.session_deliveries(first_downloaded_at,last_downloaded_at);

commit;

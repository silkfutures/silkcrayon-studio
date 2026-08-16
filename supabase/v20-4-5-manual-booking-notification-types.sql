-- Silkcrayon Studio OS V20.4.5
-- Manual/DM booking notification types + staff profile fields
begin;

-- Safe to run whether or not V20.4.3 staff migration has already been run.
alter table public.staff_profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists photo_url text;

create index if not exists staff_profiles_email_idx
  on public.staff_profiles(lower(email))
  where email is not null;

alter table public.notification_log
  drop constraint if exists notification_log_notification_type_check;

alter table public.notification_log
  add constraint notification_log_notification_type_check check (
    notification_type in (
      'booking_confirmation',
      'booking_confirmation_sms',
      'session_reminder',
      'session_reminder_sms',
      'report_reminder',
      'book_again',
      'owner_new_booking',
      'engineer_assignment',
      'session_followup',
      'package_purchase',
      'credit_booking_confirmation',
      'change_request_received',
      'change_request_decision',
      'no_show_followup',
      'booking_cancelled',

      -- Manual / DM / phone booking workflow
      'admin_booking_confirmation',
      'admin_booking_confirmation_sms',
      'manual_booking_payment_link',
      'manual_booking_payment_link_sms'
    )
  );

alter table public.notification_log
  drop constraint if exists notification_log_channel_check;

alter table public.notification_log
  add constraint notification_log_channel_check
  check (channel in ('email','sms'));

commit;

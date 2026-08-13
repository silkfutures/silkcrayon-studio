-- Silkcrayon Studio OS V8: workflow refinement and staff notification types.
-- Run once AFTER v7-automation-analytics.sql.

alter table public.notification_log drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log add constraint notification_log_notification_type_check check (
  notification_type in (
    'booking_confirmation','session_reminder','report_reminder','book_again',
    'owner_new_booking','engineer_assignment'
  )
);

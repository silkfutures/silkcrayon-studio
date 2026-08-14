alter table public.notification_log drop constraint if exists notification_log_notification_type_check;
alter table public.notification_log add constraint notification_log_notification_type_check check (notification_type in ('booking_confirmation','session_reminder','report_reminder','book_again','owner_new_booking','engineer_assignment','session_followup'));

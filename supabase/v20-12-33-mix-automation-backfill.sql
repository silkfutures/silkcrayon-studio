-- Silkcrayon Studio OS V20.12.33
-- Backfill historic mix communications into Automations -> Recent messages.
-- Safe to run more than once: every inserted historical row gets a stable provider_id
-- and the statements skip rows that already exist.

begin;

-- V20.12.32 started writing mix notifications into notification_log. Older DBs still
-- have a type constraint that predates those event names, so widen it here.
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
      'balance_payment_reminder','balance_payment_reminder_sms',
      'mix_setup_payment_email','mix_setup_payment_sms','mix_setup_paid_email',
      'mix_review_ready_email','mix_review_ready_sms',
      'mix_approved_owner_email','mix_revision_owner_email'
    )
  );

-- Historical rows are deliberately not marked "sent": before V20.12.32 the app did
-- not preserve the provider result in notification_log. This keeps the audit honest.
alter table public.notification_log
  drop constraint if exists notification_log_status_check;

alter table public.notification_log
  add constraint notification_log_status_check
  check (status in ('queued','sent','failed','skipped','historical'));

-- 1) Unpaid / part-paid mix setup email. The old activity detail records whether
-- the setup email was sent. We can identify that historical attempt and recipient.
insert into public.notification_log (
  customer_id, booking_id, channel, notification_type, recipient, subject,
  status, provider_id, sent_at, created_at
)
select
  j.customer_id, null, 'email', 'mix_setup_payment_email', c.email,
  'Historical mix setup / payment · ' || coalesce(j.track_title,'Mix'),
  'historical', 'backfill:mix_activity:' || a.id::text || ':email', a.created_at, a.created_at
from public.mix_activity a
join public.mix_jobs j on j.id=a.mix_job_id
join public.customers c on c.id=j.customer_id
where a.event_type='payment_request_sent'
  and c.email is not null and btrim(c.email)<>''
  and coalesce(a.detail,'') ilike '%email sent%'
  and not exists (
    select 1 from public.notification_log n
    where n.provider_id='backfill:mix_activity:' || a.id::text || ':email'
  );

-- 2) Matching setup/payment SMS where the old activity says SMS was sent.
insert into public.notification_log (
  customer_id, booking_id, channel, notification_type, recipient, subject,
  status, provider_id, sent_at, created_at
)
select
  j.customer_id, null, 'sms', 'mix_setup_payment_sms', c.phone,
  'Historical mix setup / payment SMS · ' || coalesce(j.track_title,'Mix'),
  'historical', 'backfill:mix_activity:' || a.id::text || ':sms', a.created_at, a.created_at
from public.mix_activity a
join public.mix_jobs j on j.id=a.mix_job_id
join public.customers c on c.id=j.customer_id
where a.event_type='payment_request_sent'
  and c.phone is not null and btrim(c.phone)<>''
  and coalesce(a.detail,'') ilike '%sms sent%'
  and not exists (
    select 1 from public.notification_log n
    where n.provider_id='backfill:mix_activity:' || a.id::text || ':sms'
  );

-- 3) Paid-on-creation setup email.
insert into public.notification_log (
  customer_id, booking_id, channel, notification_type, recipient, subject,
  status, provider_id, sent_at, created_at
)
select
  j.customer_id, null, 'email', 'mix_setup_paid_email', c.email,
  'Historical paid mix setup · ' || coalesce(j.track_title,'Mix'),
  'historical', 'backfill:mix_activity:' || a.id::text || ':paid-email', a.created_at, a.created_at
from public.mix_activity a
join public.mix_jobs j on j.id=a.mix_job_id
join public.customers c on c.id=j.customer_id
where a.event_type='mix_setup_confirmation'
  and c.email is not null and btrim(c.email)<>''
  and coalesce(a.status,'')='sent'
  and not exists (
    select 1 from public.notification_log n
    where n.provider_id='backfill:mix_activity:' || a.id::text || ':paid-email'
  );

-- 4) Review-ready email records. Each historical mix delivery generated one review
-- link. Existing V20.12.32 notification rows are left untouched.
insert into public.notification_log (
  customer_id, booking_id, session_delivery_id, channel, notification_type,
  recipient, subject, status, provider_id, sent_at, created_at
)
select
  d.customer_id, null, d.id, 'email', 'mix_review_ready_email', c.email,
  'Historical mix ready for review · ' || coalesce(j.track_title,'Mix'),
  'historical', 'backfill:mix_delivery:' || d.id::text || ':email', d.created_at, d.created_at
from public.session_deliveries d
join public.mix_jobs j on j.id=d.mix_job_id
join public.customers c on c.id=d.customer_id
where d.mix_job_id is not null
  and c.email is not null and btrim(c.email)<>''
  and not exists (
    select 1 from public.notification_log n
    where n.session_delivery_id=d.id
      and n.notification_type='mix_review_ready_email'
      and n.recipient=c.email
  );

-- 5) Review-ready SMS records.
insert into public.notification_log (
  customer_id, booking_id, session_delivery_id, channel, notification_type,
  recipient, subject, status, provider_id, sent_at, created_at
)
select
  d.customer_id, null, d.id, 'sms', 'mix_review_ready_sms', c.phone,
  'Historical mix ready for review SMS · ' || coalesce(j.track_title,'Mix'),
  'historical', 'backfill:mix_delivery:' || d.id::text || ':sms', d.created_at, d.created_at
from public.session_deliveries d
join public.mix_jobs j on j.id=d.mix_job_id
join public.customers c on c.id=d.customer_id
where d.mix_job_id is not null
  and c.phone is not null and btrim(c.phone)<>''
  and not exists (
    select 1 from public.notification_log n
    where n.session_delivery_id=d.id
      and n.notification_type='mix_review_ready_sms'
      and n.recipient=c.phone
  );

-- 6) Owner approval / revision alerts. We know these client actions existed in the
-- review flow, but the original email provider response was not retained, so they
-- are also marked Historical.
insert into public.notification_log (
  customer_id, booking_id, channel, notification_type, recipient, subject,
  status, provider_id, sent_at, created_at
)
select
  j.customer_id, null, 'email',
  case when a.event_type='client_approved' then 'mix_approved_owner_email' else 'mix_revision_owner_email' end,
  lower(sp.email),
  case when a.event_type='client_approved'
    then 'Historical mix approved · ' || coalesce(j.track_title,'Mix')
    else 'Historical mix revision requested · ' || coalesce(j.track_title,'Mix') end,
  'historical', 'backfill:mix_activity:' || a.id::text || ':owner:' || lower(sp.email),
  a.created_at, a.created_at
from public.mix_activity a
join public.mix_jobs j on j.id=a.mix_job_id
join public.staff_profiles sp on sp.role='owner' and sp.email is not null and btrim(sp.email)<>''
where a.event_type in ('client_approved','revision_requested')
  and a.channel='review_link'
  and not exists (
    select 1 from public.notification_log n
    where n.provider_id='backfill:mix_activity:' || a.id::text || ':owner:' || lower(sp.email)
  );

commit;

-- V20.2.6.2 — cancellation request resolution idempotency
begin;
create unique index if not exists credit_ledger_cancel_restore_uidx
on public.credit_ledger(booking_id)
where booking_id is not null and payment_id is null and hours_delta > 0;
commit;

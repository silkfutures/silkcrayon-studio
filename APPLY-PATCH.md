# V20.12.33 — Mix automation history backfill

Apply this on top of V20.12.32.

## Replace
- `app/admin/automation/page.js`
- `app/globals.css`

## Run once in Supabase SQL Editor
- `supabase/v20-12-33-mix-automation-backfill.sql`

The migration is idempotent and can safely be run again. It backfills older mix setup/payment messages, review-ready deliveries, and owner approval/revision alerts when enough historical data exists.

Historical rows are intentionally labelled **Historical**, not **Sent**, because the old mix activity table did not retain the email/SMS provider delivery result. Future mix communications continue to be logged live as Sent / Failed / Queued / Skipped.

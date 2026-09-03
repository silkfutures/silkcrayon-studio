# Silkcrayon Studio OS V20.7.4 — delivery audit trail

Run after V20.7.2 and V20.7.3.

## What changed
- Files-ready email and SMS are each written to `notification_log` with queued/sent/failed status and linked to the exact delivery.
- Automations shows `Files ready · email` and `Files ready · SMS` as separate rows.
- Automations adds File delivery activity with sent time, first download, download count and last download.
- Customer downloads now pass through `/files/[token]/download`, which records the first actual download before redirecting to a short-lived private Supabase URL (or the supplied external link).
- Opening the email or delivery landing page does not falsely count as a download.
- Re-delivering files for the same booking is supported; notification uniqueness is scoped to the individual delivery.

## Database
Run `supabase/v20-7-4-delivery-audit.sql` after the V20.7.3 migration.

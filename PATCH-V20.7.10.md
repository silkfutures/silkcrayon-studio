# Silkcrayon Studio OS — V20.7.10 hotfix

## Fixes

- Manual artist registration no longer fails when an older production database is missing the V20.6 CRM consent-audit columns.
  - The API now falls back to saving the core email/SMS consent state rather than blocking artist creation.
  - `supabase/v20-7-10-crm-consent-hotfix.sql` safely adds the four audit columns and reloads the Supabase/PostgREST schema cache.
- Test-artist deletion now handles paid local/manual test bookings of £1 or less.
  - If there is no Stripe PaymentIntent, the local test payment is voided before the protected hard-delete RPC runs.
  - Genuine Stripe payments remain protected and still require a completed refund before deletion.

## Deploy order

1. Run `supabase/v20-7-10-crm-consent-hotfix.sql` in Supabase SQL Editor.
2. Replace the changed app files.
3. Deploy.

No destructive schema changes are included.

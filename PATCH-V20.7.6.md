# Silkcrayon Studio OS — V20.7.6

## Accounting correction
- Adds **Correct payment** beside non-Stripe paid ledger entries.
- Original manual booking payments can be changed back to unpaid with a correction reason.
- Manual `studio_payments` can be voided with a reason.
- Voided/corrected money immediately drops out of Accounting, CSV revenue, and dashboard revenue calculations.
- Corrections are auditable rather than hard-deleting financial history.
- Stripe-linked payments stay protected and must use the genuine refund workflow.

## Owner revenue dashboard
The Studio OS homepage now shows:
- Collected this month (net of refunds)
- Percentage change vs last month
- Last month collected
- Upcoming booking value
- Outstanding amount still to collect
- Revenue split between session bookings, extra studio time and other studio payments

Revenue uses `paid_at`, so it reflects when money was actually collected rather than the future session date.

## Migration
Run `supabase/v20-7-6-accounting-corrections.sql` after V20.7.5.

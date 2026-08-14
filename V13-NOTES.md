# V13 — Owner controls, Stripe reconciliation, refunds & accounting

## Public site
- Hero keeps the stronger V12 message but restores Title Case typography:
  `A Studio For Artists Who Want To Go Further.`

## Owner controls
- Cancel bookings from customer/booking views
- Full Stripe refund + cancellation from Studio OS
- Hard-delete test bookings only when value is £1 or less
- Hard-delete test customers only when all their bookings are test-value records
- Paid test records must be refunded before deletion

## Stripe payment reconciliation
- New `Sync Stripe payments` control checks older unpaid bookings against the Stripe Checkout Session.
- This is specifically useful for bookings paid before the production webhook was connected.
- It also backfills PaymentIntent and invoice metadata where available.

## Accounting
- Stripe invoice creation enabled on new booking, package and staff-created Checkout payments
- Stripe invoice metadata stored in Supabase
- `/admin/accounting` ledger for gross sales, refunds and net collected
- CSV export for bookkeeping
- Invoice links from customer history
- VAT is deliberately not calculated automatically

## Refunds
- Owner-only full refund uses Stripe Refunds API
- Booking is marked refunded and cancelled
- Customer receives a refund email
- Partial-refund backend support is included, although V13 UI uses full refund/cancel for simplicity

## Setup
1. Run `supabase/v13-accounting-refunds.sql`
2. Deploy V13
3. Run `Sync Stripe payments` once in `/admin` to repair historical paid-but-unpaid records.
4. In Stripe Dashboard, enable customer emails for successful payments if you want Stripe to email its invoice/receipt links automatically.

No new Vercel variables are required.

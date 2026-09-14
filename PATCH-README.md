# Accounting and Pay by Bank patch — 14 September 2026

Apply on top of your existing project and the previous payment/report patch. Merge the included app, components, lib and tests folders into the project root, replacing matching files only. No dependency or SQL changes required. Deploy through your normal workflow.

Fixes:
- Accounting gross/net totals, transaction list and CSV now include mix_jobs payments, both manual and Stripe, using paid_amount_pence and paid_at. Previously recorded mix payments automatically appear. No duplicate studio_payments record is created. Unpaid quotes are excluded. A missing historical payment date is shown explicitly, rather than inventing one.
- The dashboard already includes mixes under Money in → Mix / master jobs based on paid_at; this patch fixes the separate accounting ledger/export omission. Accounting totals remain all-time as before. If the monthly dashboard itself is still wrong, the live mix's paid_at and paid_amount_pence need inspection; this archive does not access live data.
- Removes unsupported payment_method_options[pay_by_bank][statement_descriptor] from new-booking Checkout requests. Bank-only and card-or-bank choices are preserved.
- If payment-link creation fails after booking creation, the form now reports that the booking was saved instead of encouraging a duplicate booking.
- CSV rows now use real line breaks.

For the booking that already failed: check the calendar/customer first. The old route created the booking and sent confirmation before trying Stripe. Do not create the same booking again just to retry payment; arrange payment from the existing booking/customer workflow.

Validation: import checks, existing contract tests, mix payment tests, new mix accounting tests, mocked bank-only/card-or-bank Checkout request tests and Next.js production build passed. Live Stripe, database operations and browser end-to-end flow were not tested. Build reported missing local Supabase environment variables, as expected for this source-only workspace.

Additional tests:
node tests/mix-accounting.mjs
node tests/bank-checkout.mjs

Stripe reference: https://github.com/stripe/stripe-php/blob/master/lib/Checkout/Session.php

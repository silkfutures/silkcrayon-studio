# Silkcrayon consolidated promotional patch — 27 October 2026

Copy files from this ZIP into the same paths in your EXISTING repo. This is **not a whole-site replacement**.

## Included
- Premium **Selected Artists** private invitation page (`/supported-artists`), existing approval workflow untouched.
- **Studio Pass** purchase page (`/studio-pass`) and a subtle callout on `/booking`; sliding selector for 4–8 hours. Rates: 4–5 hours £40/h, 6–7 hours £37.50/h, 8 hours £35/h. The 30-day validity is explicit and enforced with the included SQL migration.
- **RELAUNCH40** private, unlisted purchase link (`/relaunch40`), £80 for 2 prepaid hours, purchase 30 Oct–2 Nov 2026, sessions must take place in November. The checkout enforces the purchase dates. Do not publish the private page in navigation.
- Checkout computes prices on the server and webhook records pass expiry. The old public `/buy-hours` relaunch upsell is removed.

## REQUIRED setup, in order
1. Back up Supabase and review + run `supabase/patch-studio-passes-30-days.sql` in SQL Editor before deploying the checkout pages. This is a **database migration**, not something Vercel deploys automatically. New pass checkout refuses to proceed when the tracking table does not exist.
2. Overlay files, commit and deploy through your existing GitHub/Vercel workflow.
3. Perform test Stripe purchases of each pass tier and RELAUNCH40. Verify paid webhook created `studio_pass_purchases` and positive `credit_ledger` records; test bookings before and after expiry against a development database.
4. Review cancellation/refund treatment: manual adjustments and refunds may require a proportional reinstatement of pass allowance. Avoid selling passes until end-to-end tests pass.

## Limitations and attention needed
- **Critical**: the existing portal reads raw `credit_ledger` totals. Expiry is reconciled when the customer attempts a credit booking, not continuously on every portal view. Before expiration reconciliation, a dashboard might temporarily show stale hours. Other portal balance queries should call `expire_studio_passes` server-side.
- RELAUNCH40 provides two **prepaid** studio hours, not an instant discount on any date/time booking. The code is the private campaign name and the `/relaunch40` link is its redemption mechanism; there is not yet a free-text coupon field in ordinary booking checkout.
- One-per-customer checking includes only purchases using the same campaign code; pending concurrent checkouts are not a full anti-abuse control.
- An unlisted link is not password protected. Artist invitations still require approval.
- Legacy fixed `/project-pass` from a prior patch is intentionally superseded by the slider and not included.
- This patch has NOT been deployed or verified with a live Stripe transaction. Review UK consumer-law fairness of credit expiry, refund and cancellation policy before release.

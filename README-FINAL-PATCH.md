# Silkcrayon consolidated promotional patch — 27 October 2026

Copy files from this ZIP into the same paths in your EXISTING repo. This is **not a whole-site replacement**.

## Included
- Premium **Selected Artists** private invitation page (`/supported-artists`), existing approval workflow untouched.
- **Studio Pass** purchase page (`/studio-pass`) and an integrated **top-of-booking choice** on `/booking` (Book a Session selected by default; Studio Hour Pass reveals the inline purchase slider); sliding selector for 4–8 hours. Prices: 4h £170 (£42.50/h), 5h £210 (£42/h), 6h £240 (£40/h), 7h £280 (£40/h), 8h £300 (£37.50/h). No public pass rate below £37.50/h. The 30-day validity is explicit and enforced with the included SQL migration.
- **RELAUNCH40** private, unlisted purchase link (`/relaunch40`), £80 for 2 prepaid hours, purchase 30 Oct–2 Nov 2026, sessions must take place in November. The checkout enforces the purchase dates. Do not publish the private page in navigation.
- Checkout computes prices on the server and webhook records pass expiry. The old public `/buy-hours` link is removed from booking navigation (the legacy route itself remains available).

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

## Final pricing revision
The UI and Stripe checkout both use the fixed server-validated prices £170/£210/£240/£280/£300 for 4/5/6/7/8 hours. Do not use the superseded £280 eight-hour or £225 six-hour offer. The checkout endpoint rejects the former `project_pass` type with HTTP 410. The standalone legacy `/buy-hours` page still exists at standard rates and is not part of this discounted Studio Pass offer.

## Booking layout update
- `/booking` now shows two booking-mode cards above the booking flow, with normal booking selected by default. Selecting Studio Hour Pass reveals the existing 4–8 hour checkout slider inline.
- This uses `components/BookingModeChooser.js`, which is included in this patch. It changes the page presentation, not the Stripe webhook/credit ledger logic.

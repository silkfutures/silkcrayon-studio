# Silkcrayon OS — enquiry / invoice / booking reconciliation fix

## What this fixes
An enquiry may have generated a **custom invoice** and a studio booking may have been created later. In that case, payment can be recorded in `studio_payments` without settling the new booking. This extends the earlier payment sync patch so **paid Stripe-backed invoice payments** (kind `other`, as well as `session`) can be manually matched to an existing booking by the OS owner.

## Apply
Merge the included files into the corresponding paths of your **current** GitHub branch. They are based on `silkcrayon-studio-main (10).zip` and the earlier payment-sync patch: do **not** overwrite newer Stripe/mix changes blindly. No SQL migration is included.

## Georgia Croft
Open OS → Payments → Recent payments, select Georgia's £80 payment, choose her NHS Wales podcast booking, then Verify & mark paid. The control appears only on eligible Stripe Checkout payments, and only when the payment has not already been linked. The booking must belong to the same customer, have an exact £80 outstanding balance, and have no other paid transaction linked. The server verifies Stripe's paid session, amount, currency and original payment ID before changing records.

If no dropdown appears, Georgia may instead have paid a **general invoice** under `invoices`, or the project invoice record may not have an associated `studio_payments` Checkout session. Do not attempt to force-match it; the separate invoice record must be traced and verified first. This patch will not repair those cases automatically.

## Accounting caution
A previously recorded invoice payment may already count as revenue, and the booking can also count as revenue in some reports. Review Money reporting for duplicate income after reconciliation; do not treat this status-repair as a second payment. It does **not** create another Stripe charge or send any messages.

## Validation
Check build and database in Vercel Preview, verify customer/amount mismatches are rejected, test against Stripe test Checkout, and confirm Today reflects paid. A successful card charge alone is never proof that a given booking was funded. Production integration has not been tested here.

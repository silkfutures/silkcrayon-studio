# Silkcrayon OS — Stripe session payment reconciliation

**Based on uploaded `silkcrayon-studio-main (10).zip` (21 October).** Copy the six file paths under `app/` and `components/` into the same paths in your GitHub project. Merge carefully with later mix patches. No SQL migration required.

## Existing paid booking
Open **OS → Payments → Recent payments**. Find the successful unlinked Session payment. Use **Match to session…** then **Verify & mark paid**. The app checks Stripe Checkout payment status and exact amount, customer identity, and existing booking balance. Only the OS owner can perform reconciliation. Refresh Today to see Paid. If no matching booking appears, do not charge again; compare the amount/customer in Stripe and booking records.

## Future transactions
When creating a Session payment from OS → Payments, select the specific booking. The payment and Stripe checkout will carry its ID, so the webhook updates booking payment status. Linked bookings require exact outstanding amount. For partial payments use a separate supported deposit workflow; do not pass a partial payment as fully paid.

## Checks before production
Set and verify `STRIPE_WEBHOOK_SECRET` for the `/api/stripe/webhook` endpoint. Stripe Dashboard → Workbench → Webhooks → event `checkout.session.completed` or `checkout.session.async_payment_succeeded` must succeed (2xx). Preview-test completed card checkout and async Pay by Bank, including duplicate event delivery. This patch has not been tested against live Stripe or Supabase. Use Stripe test mode before deploying live.

**Important**: Reconciliation verifies existing payment, and never creates a second charge or refund. If a single paid checkout covers multiple bookings, or payment value differs, manual review is required.

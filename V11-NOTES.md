# Silkcrayon Studio OS V11 — Credits + Self-Service

## New
- Customers can book directly with prepaid studio hours from My Studio.
- Credit deduction and slot reservation happen atomically in Supabase.
- Customers can reschedule confirmed sessions from their portal.
- Customers can submit cancellation requests without the app silently refunding/cancelling paid card bookings.
- Owner dashboard surfaces cancellation requests.
- Credit bookings are excluded from cash-revenue analytics to prevent double counting package revenue.
- Customer change cutoff defaults to 24 hours.

## Deploy
1. Run `supabase/v11-credit-booking-self-service.sql`.
2. Optional Vercel variable: `CUSTOMER_CHANGE_CUTOFF_HOURS=24`.
3. Redeploy.

## Deliberate safety
Cancellation requests do not automatically refund Stripe payments. The owner reviews the request first.

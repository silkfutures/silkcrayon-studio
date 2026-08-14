# Silkcrayon Studio OS V10 — Artist Portal

V10 gives customers their own passwordless portal without requiring a traditional account/password.

## New
- `/account/login` — customer enters booking email and receives a secure sign-in link
- `/account` — mobile-first artist portal
- upcoming and previous bookings
- prepaid studio-hour balance
- buy 2 / 5 / 10-hour packages directly from the portal
- secure 30-day customer session cookie
- one-time sign-in links expire after 30 minutes
- package payments still use the existing Stripe webhook and credit ledger

## Setup
1. Run `supabase/v10-customer-portal.sql` after V9.
2. No new required environment variables.
3. Redeploy Vercel.
4. Visit `/account/login` and use an email already stored in the Silkcrayon customer database.

## Next
V11 should make prepaid credit usable directly during self-service booking, plus reschedule/cancel tools and calendar-aware customer rebooking.

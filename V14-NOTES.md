# V14 — Mobile Studio OS + session lifecycle

## Mobile app shell
The bottom navigation is now persistent throughout Studio OS instead of disappearing when an owner moves from Engineer View into Artists, Payments, Sessions, CRM etc.

Owner mobile nav:
- Home
- Artists
- Pay
- Sessions
- More

Engineer mobile nav:
- Today
- Artists
- Pay
- Sessions
- More

`More` keeps accounting/analytics/automations/staff out of the daily workflow without hiding them.

## Session lifecycle
Real bookings should not be hard-deleted. They become one of:
- completed
- cancelled
- no_show

The session detail screen now includes Manage Session.
Owners can:
- cancel with a required reason
- refund + cancel paid sessions
- delete eligible test bookings
- see lifecycle history

Assigned engineers can:
- mark day-of/past sessions as no-show
- see lifecycle history

## No-show automation
Marking a no-show:
- records the outcome permanently
- does not auto-refund card payments
- does not restore prepaid credits
- emails the customer: “We missed you” + Book Another Session
- alerts the owner if an engineer marked it

Artist/customer profiles now display no-show count, with extra visual attention after 2+.

## Audit trail
`booking_events` preserves:
- cancellations and reasons
- no-shows
- completed sessions
- refunds
- test-record deletion

Even a hard-deleted test booking leaves its deletion snapshot in `/admin/activity`.

## Setup
Run `supabase/v14-lifecycle-audit.sql` before deploying.

No new Vercel environment variables are required.

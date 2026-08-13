# Silkcrayon Booking System — V1

A Vercel-ready Next.js booking system using Supabase for customers/bookings and Stripe Checkout for payment.

## What V1 includes

- Silkcrayon marketing homepage using the supplied studio photography
- Bookable services with live availability
- 30-minute slot calculation and overlap prevention
- 30-minute temporary slot hold while a customer pays
- Stripe-hosted secure checkout
- Stripe webhook confirmation / expired checkout cleanup
- Supabase customer CRM and booking database
- Password-protected admin dashboard
- Upcoming bookings, booking status controls and monthly paid total
- Studio blockouts for holidays / maintenance / private sessions
- Customer directory + CSV export
- Responsive Silkcrayon black / white / #C394FF design

## Default booking rules — edit these before launch

`lib/services.js` contains all business rules in one place.

Current V1 defaults:
- Vocal Recording: £60/hour, 1–4 hours
- Artist Development & Industry Guidance: £60/hour, 1–2 hours
- Full Day: £450, 8 hours
- Monday–Friday: 10:00–22:00
- Saturday: 10:00–20:00
- Sunday: closed
- Availability increments: 30 minutes
- Payment: full payment at checkout

These are intentionally easy to change.

## 1. Create Supabase

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. In Project Settings -> API Keys, copy:
   - Project URL -> `SUPABASE_URL`
   - Secret key -> `SUPABASE_SECRET_KEY`
5. Do **not** expose the secret key to the browser. This project uses it only in server routes/components.

The database has:
- `customers`
- `bookings`
- `blockouts`

RLS is enabled with no public policies. V1 performs database work server-side only.

## 2. Create Stripe

1. Create / use your Stripe account.
2. Copy your secret key -> `STRIPE_SECRET_KEY`.
3. After deploying, add this webhook endpoint in Stripe:
   `https://YOUR-DOMAIN/api/stripe/webhook`
4. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the endpoint signing secret -> `STRIPE_WEBHOOK_SECRET`.

V1 uses Stripe Checkout, so card details never pass through this application.

## 3. Environment variables

Copy `.env.example` to `.env.local` locally, or set the same values in Vercel Project Settings -> Environment Variables.

Set `NEXT_PUBLIC_SITE_URL` to the exact deployment URL, for example:
`https://silkcrayon.com`

Set a long random `ADMIN_PASSWORD`. `/admin` and `/api/admin/*` use HTTP Basic Auth in V1.

## 4. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5. Deploy to Vercel

Push this folder to GitHub, import the repo into Vercel, add the environment variables, then deploy.

No custom build configuration is required; Vercel detects Next.js.

## Important before taking real bookings

- Replace the placeholder privacy wording with a proper Privacy Notice and link it in the booking flow.
- Confirm the opening hours, service prices and cancellation/refund policy.
- Test Stripe in Test Mode end-to-end before switching to live keys.
- Make one test booking, verify the webhook changes it to `confirmed`, then verify it appears in `/admin`.
- The V1 admin uses Basic Auth. It is appropriate as a temporary internal gate if you use HTTPS and a strong unique password, but V2 should replace this with Supabase Auth / role-based admin access.
- V1 takes full payment. Deposits, rescheduling, refunds, email reminders and calendar sync belong in V2.

## Where to edit things

- Services/prices/hours: `lib/services.js`
- Homepage: `app/page.js`
- Booking UX: `components/BookingFlow.js`
- Brand styles: `app/globals.css`
- Database: `supabase/schema.sql`
- Admin: `app/admin/`

## Suggested V2

- Branded booking confirmation + 24h reminders
- Google Calendar sync
- Customer self-service reschedule/cancel link
- Deposits / packages / credits
- Refund workflow
- Supabase Auth admin login
- Customer notes / tags / lifetime value
- Booking source attribution
- Automated post-session follow-up

## V2 upgrade
If V1 is already live, run `supabase/v2-upgrade.sql` once in the Supabase SQL Editor before deploying this version.

New in V2: £0.30 private test booking option, mandatory No Harmful Music Policy acceptance, Artist Development removed as a bookable service, first-party page-view tracking, expanded admin dashboard, and engineer session reports at `/admin/sessions`.

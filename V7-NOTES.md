# Silkcrayon Studio OS V7 — Automation + Analytics

## New
- Owner Analytics dashboard: `/admin/analytics`
- Owner Automations dashboard: `/admin/automation`
- Booking-confirmation email after successful Stripe checkout
- Daily next-day session reminders
- Daily post-session "book again" emails
- Notification audit log in Supabase
- Vercel Cron route at `/api/cron/studio-automations`
- Engineer V6 interface retained unchanged

## Required database upgrade
Run `supabase/v7-automation-analytics.sql` once in Supabase SQL Editor.

## Email configuration
The app is safe to deploy without email credentials: notifications will be logged as `skipped` instead of crashing.
To activate email delivery add to Vercel:
- `RESEND_API_KEY`
- `EMAIL_FROM` — e.g. `Silkcrayon Studio <bookings@your-verified-domain.com>`

The FROM address/domain must be verified with your email provider.

## Cron
`vercel.json` schedules the automation endpoint daily at 09:15 UTC. Vercel invokes cron routes on production deployments. If `CRON_SECRET` is configured by Vercel, the route validates the bearer token.

## Deliberately not included yet
- SMS (would require a messaging provider and consent/cost decisions)
- Customer self-service rescheduling/cancellation
- Native Tap to Pay

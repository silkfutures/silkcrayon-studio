# Silkcrayon Studio OS V8 — Workflow Refinement

V8 focuses on making the existing booking operation seamless rather than adding another large feature set.

## What changed
- Customer confirmation email remains automatic after paid Stripe Checkout.
- Every paid booking now emails all active Owner accounts: **New booking — assign engineer**.
- Assigning an engineer now emails that engineer with the artist, date/time and a direct session link.
- Owner home has a prominent **Needs assigning** queue before the normal schedule.
- Engineer home now shows both **Today** and **Upcoming (next 14 days)**.
- Assignment controls show immediate success/error feedback instead of silently refreshing.
- Engineer schedule cards show payment state and open directly into the session workspace.

## Migration
Run `supabase/v8-workflow-refinement.sql` once after V7. It expands allowed notification types.

## Email configuration
V8 uses the same V7 variables: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`.
No new Vercel variables are required.

# Silkcrayon Studio OS — V20.2.6 Release Candidate

Next.js + Supabase + Stripe + Resend + optional Twilio system for the Silkcrayon website, bookings, My Studio customer portal, owner/engineer operations, CRM and lifecycle messaging.

## V20.2.6 upgrade
1. Run `supabase/v20-2-5-audit-hardening.sql` if not already run.
2. Run `supabase/v20-2-6-release-hardening.sql`.
3. Configure the variables in `.env.example`.
4. Deploy to the Vercel preview domain.
5. Run a real end-to-end test before changing DNS.

## Production rules
- Keep `ENABLE_SYSTEM_TEST_BOOKING=false`.
- Remove `ADMIN_USERNAME` / `ADMIN_PASSWORD` after the owner account exists.
- Configure `CRON_SECRET` or automated reminders cannot run.
- Essential booking SMS must remain service-only; promotional content belongs in separately consented marketing messages.
- Studio Finish defaults: £60, within 7 days, 1 revision.

## QA commands
- `npm run check:imports`
- `npm run test:contracts`
- `npm run build`

## External endpoints
- Stripe webhook: `/api/stripe/webhook`
- Twilio inbound/opt-out webhook: `/api/twilio/inbound`

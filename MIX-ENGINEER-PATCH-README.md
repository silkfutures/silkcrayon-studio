# Silkcrayon — Engineer Mix Workflow Patch

Source snapshot: `silkcrayon-studio-main (10).zip` (21 October 2026). This patch must be merged with later UI/speed patches; do not overwrite the whole repository.

## Install
1. Back up database and deploy first to Vercel **Preview**.
2. Copy files in this ZIP into matching repository paths, retaining all other project files.
3. Execute `supabase/v20-12-44-mix-engineer-portal.sql` and then `supabase/v20-12-45-mix-revision-fulfilment.sql` in the Supabase SQL editor. These are additive migrations. Protect service-role keys.
4. Check STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL and existing Stripe Connect onboarding. Ensure `checkout.session.completed` and `checkout.session.async_payment_succeeded` events reach `/api/stripe/webhook`.
5. Open an owner mix job: select assigned engineer and agreed engineer fee (£). Engineer opens OS > My assigned mixes, uploads WAV/MP3/radio edits together with notes; client receives existing secure review email/SMS, can approve or request revisions. Upon approval the server attempts a Stripe Connect transfer and engineer gets emailed.
6. After included revision allowance is used, the public review page shows Stripe checkout for one extra revision (£25 per round by default, configurable in `mix_jobs.extra_revision_price_pence`). Verified webhook atomically grants credit. Refresh the review page after checkout.
7. Test first with Stripe TEST mode: a fresh paid-by-Stripe mix job, assigned engineer with Stripe Express onboarding, approval, repeat webhook, multiple-file upload, extra paid revision, and a non-Stripe manual-paid job.

## Important limitations and safeguards
- Approval triggers a **Stripe transfer to the engineer's connected Stripe account**, not an instant bank payout. Arrival in their bank is controlled by their Stripe payout schedule.
- Transfers require the original job to be paid in full with Stripe and source charge to cover the engineer fee. Offline paid jobs are held for manual settlement, not paid from the general balance.
- A unique job payout row, conditional claim, Stripe transfer-group lookup and idempotency key reduce duplicate transfer risk. On errors owner sees status and can retry. Do not change agreed fee once approved.
- Engineer access to a mix requires explicit assignment; the API checks ownership, not merely an engineer role. Owner sees all jobs.
- Existing multi-file delivery uses signed Supabase uploads and already supports up to 50 attachments. **Resumable TUS uploads are not in this patch**; large-file stability and storage plan limits still need a separate production-tested TUS integration.
- Client approval email/SMS uses your current configured notification provider; SMS delivery requires configured provider and customer phone.
- Revision price defaults to £25, not configurable in the OS UI in this patch. Owner can change it in Supabase; future admin setting recommended.
- The payout currently represents a single agreed base fee per job; revenue sharing on additional paid revisions is not yet automated.
- This was import-path checked but **NOT built or live-tested** because dependencies are not installed in the working container. Thorough end-to-end testing is essential before production.

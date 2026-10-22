# Silkcrayon OS — Clean Mix UI + Engineer Offers

## Base and deployment order

This is a **delta on top of the earlier `silkcrayon-mix-engineer-workflow-patch.zip`**. It contains those same mix workflow files plus the new offers and layout updates. Apply against your **latest GitHub main**, merging any files changed since that patch; do not replace the full repository. Prior payment reconciliation, enquiry and booking changes are not bundled here.

1. Commit current production code to a recovery branch.
2. Run `supabase/v20-12-44-mix-engineer-portal.sql` and `supabase/v20-12-45-mix-revision-fulfilment.sql` **only if not already applied**.
3. Run **new** `supabase/v20-12-46-mix-offers.sql` in Supabase SQL editor.
4. Copy the patch files to matching paths in your repository. Merge rather than overwrite any concurrent changes in `app/api/stripe/webhook/route.js`, `app/admin/mixes/[id]/page.js`, and engineer pages.
5. Deploy to a Vercel preview first. Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, Resend email and Supabase Storage bucket `session-deliveries` are configured.
6. Test in preview: open an unpaid mix and send an offer with a short MP3; engineer signs in, listens, declines; send again, engineer accepts; verify assigned engineer and agreed fee, then customer approval -> payout per original mix-workflow conditions. Confirm no payout on merely accepting offer.

## User flows

- Owner: `/admin/mixes/[id]` → **Offer this mix to an engineer** → choose staff engineer, agreed fee, optional audio demo and brief → Send.
- Engineer: `/admin/engineer/mixes` shows pending offers → opens job → listens → Accept/Decline. Email notification contains a link to their staff workspace, **not a public demo URL**.
- Owner can cancel an unanswered offer, and can also bypass offering via **Engineer assignment & approval payout**.
- Private demos reside in `session-deliveries` in a per-job path and are served as short-lived signed URLs after staff access checks.
- Owner mix detail now collapses track list, job brief, history, revisions, delivery and danger zone by default; key payment/assignment controls remain visible.

## Boundaries / known limitations

- Audio upload uses the existing Supabase signed-upload approach. It is **not** the previously discussed resumable TUS large-file upload solution; use a compressed MP3 demo for offers until that is added.
- The refactored layout is **mix detail first**. It doesn't yet redesign every OS page in the video. Avoid untested wholesale CSS replacements.
- Pending offers block a second pending offer; cancel or wait for decline. Accepting an offer assigns the engineer. Approval-triggered payout remains subject to verified card funding and Stripe Connect onboarding; sending or accepting an offer alone pays nobody.
- Test database migrations, email delivery and Stripe in preview; this patch has not been verified against production.

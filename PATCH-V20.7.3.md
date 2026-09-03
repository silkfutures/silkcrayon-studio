# Silkcrayon Studio OS — V20.7.3

This patch turns Silkcrayon-hosted file delivery into temporary delivery rather than permanent cloud storage.

- Uploaded session deliveries expire 30 days after delivery.
- Customer-facing `/files/[token]` stays on the Silkcrayon domain and creates a short-lived private Supabase download URL only when the customer opens the page.
- The delivery page clearly shows the expiry date.
- Expired upload pages remain branded and explain how to contact the studio rather than exposing a broken storage link.
- The existing daily `studio-automations` cron now deletes expired uploaded objects from the private `session-deliveries` bucket and marks the delivery as deleted.
- External Drive / Dropbox / WeTransfer links are not stored by Silkcrayon and are not automatically deleted.
- Files-ready email/SMS tells customers that Silkcrayon-hosted uploads are available for 30 days.

## Required database step
Run `supabase/v20-7-3-delivery-expiry.sql` after the V20.7.2 delivery migration.

No new Vercel cron is required; cleanup runs inside the cron already configured at `/api/cron/studio-automations`.

# Silkcrayon Studio OS — V20.7.11

## Dry Hire ID verification

Run `supabase/v20-7-11-dry-hire-id-verification.sql` **before deploying the code**.

### Booking flow
- Dry Hire remains £40/hour with a 2-hour minimum.
- Public Dry Hire requires the lead hirer to confirm they are 18+, accept the Dry Hire Terms, provide a mobile number and home postcode.
- Public paid Dry Hire bookings receive the normal confirmation plus a tailored immediate SMS.
- If the customer has not already been verified, Studio OS automatically sends a separate secure ID-check email and SMS after the booking is confirmed.
- Manual Studio OS Dry Hire bookings now do the same. If the automatic ID request fails, the booking itself still succeeds and Studio OS surfaces a warning instead of encouraging a duplicate booking.
- Returning customers with an existing Dry Hire ID verification are not asked to upload again unless the owner explicitly resets verification.

### Customer ID upload
- Customer receives a Silkcrayon `/dry-hire-id/...` link.
- Raw access tokens are never stored in the database; only a SHA-256 hash is stored.
- Link is time-limited and invalid for cancelled/closed bookings.
- Customer must confirm 18+ and upload a driving licence or passport image.
- Images only: JPG, PNG, WebP, HEIC/HEIF; 8 MB maximum.
- Upload goes directly to a private Supabase Storage bucket through a signed upload token; ID bytes do not pass through Vercel.
- Submitted ID is owner-only and can only be opened through a 5-minute signed preview link.

### Owner workflow in View Session
Dry Hire sessions show a Lead Hirer ID panel with:
- ID required
- Request sent / resend
- Submitted — review now
- Open ID securely
- Verify + delete photo
- Reject + request new
- Mark verified in person
- Request new ID for an already-verified customer

The Home session cards also flag `ID required` / `ID verified`, and artist profiles show the reusable Dry Hire ID verification state.

### Privacy / retention hardening
- Verification is reusable at customer level, but the ID image is not retained after verification.
- Successful verification deletes the uploaded photo **before** marking the customer verified.
- If deletion fails, Studio OS refuses to complete upload-based verification rather than breaking the privacy promise.
- Original upload filename/MIME/size are cleared when the image is deleted.
- Unreviewed submitted images expire after 7 days.
- Prepared-but-never-submitted uploads are eligible for cleanup after 24 hours.
- The existing daily Studio OS cron removes expired ID objects.
- Cancellation/no-show invalidates the ID link and attempts immediate deletion of any temporary ID image; if storage deletion fails, it remains tracked for retry by cron rather than becoming an orphaned object.
- Reissuing an ID request will not drop the database pointer to an old object unless that old object has been securely removed.
- Dry Hire ID rows have RLS enabled with no client read policies. Owner/server routes use the service role.

### Day-before safety net
- If a confirmed Dry Hire booking is still unverified the day before, Studio OS reissues the secure request.
- A submitted ID awaiting owner review is not destroyed/replaced by the reminder job.
- Reminder SMS clearly states whether ID is verified or still required.

### Compatibility hardening
The SQL widens the legacy `bookings.payment_method` constraint to the values already used by current Studio OS (`bank_transfer`, `cash`, `other`, `manual_voided`, etc.), preventing manual-payment correction flows from failing against older V11 schemas.

## Validation
- `npm run check:imports` — PASS
- `npm run test:contracts` — PASS
- TypeScript parser syntax pass across every changed JS/JSX file — PASS
- `npm run build` reaches the Next build step, but cannot run in the supplied archive because dependencies / the `next` binary are not installed (`next: not found`).

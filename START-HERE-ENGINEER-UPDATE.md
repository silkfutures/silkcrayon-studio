# Engineer OS, analytics and quote update

1. Run `APPLY-THIS-UPDATE.sql` in the existing Supabase project's SQL Editor BEFORE deploying. It adds locked rescheduling, quote fields/delivery logs and analytics prerequisites. Existing data is retained.
2. Deploy this complete project folder to the existing Vercel project. Keep existing environment variables.
3. Confirm RESEND_API_KEY and EMAIL_FROM use your verified sender. Set EMAIL_REPLY_TO to your monitored studio inbox. Engineer assignment emails use their sign-in email; your test account therefore sends to your address.
4. Open Analytics → Check tracking. Visit a public page in a separate tab, then refresh Analytics to check browser recording. Historical visits that were never saved cannot be recovered.
5. Assign and reschedule a test booking and check the test inboxes/SMS. Live delivery, payments and SQL execution still need this deployment check; no production credentials were included in the upload.

## Included
- Responsive engineer booking form and artist cards; fixed validation that rejected valid dates, times and emails.
- Assigned-only engineer rescheduling, customer email/SMS and engineer email notifications, with locked availability and visible delivery failures.
- Assignment email result/retry control; consistent sign-in email for manual/automatic assignments and engineer-created paid bookings. Customer confirmation added for engineer-created paid bookings.
- Assigned-only access for delivery, lifecycle, call-prep and calendar downloads; removed owner-only links from engineer screens.
- Persistent Hide sensitive data toggle throughout admin. Masks tagged financial values/inputs, revenue charts, spend and financial audit notes. Screen privacy only: underlying owner-authorized data and external/downloaded documents are not anonymised.
- Analytics pagination to avoid omitting newer visits; honest write/query errors, storage-blocked browser fallback, London dates, today/yesterday/peak totals, larger exact-value daily bars/table and tracking health diagnostics. Revenue uses Accounting's receipt calculation to avoid mirrored receipts being counted twice.
- Music, voiceover/audiobook, dry hire and podcast quote templates with editable scope, file handover, exclusions and timing/revisions. Create quote/project saves a draft. Review it on the project page, save and press Send quote to customer. Save never sends automatically. Versioned delivery logs prevent duplicate sends; failed sends can be retried. Quotes do not collect payment or reserve dates.

## Verification
Existing regression tests plus new authorization, reschedule/clash, notification failure, booking validation, analytics pagination/write failure and quote version/duplicate-send tests. Browser fixture checks cover desktop/mobile, booking payloads, failed notification messages, privacy controls and daily analytics. No real customer messages were sent.

Complete the test-account deployment checks before onboarding Billy. Provider acceptance does not guarantee inbox delivery. A failed reschedule notification requires direct customer follow-up; the session has already moved.

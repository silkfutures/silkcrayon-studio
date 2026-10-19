# Silkcrayon Supported Artists — installation

This is a cumulative patch against the uploaded Silkcrayon project. It includes the latest Meet the Engineers section and the genre copy changes, plus the supported artist programme. It does not deploy or change your live database automatically.

## Install

1. If not already installed, run `supabase/v20-12-39-supported-artists.sql`. Then run `supabase/v20-12-40-supported-artist-rates.sql` in your existing Supabase project's SQL editor. Run this BEFORE deploying the code. The existing studio schema, customer portal, staff roles, reservation functions and overnight booking migration must already be installed.
2. Merge the patch folders into the repository root (the folder containing package.json), replacing matching files. Do not replace entire app/components/public folders with these partial folders.
3. Commit/push and allow the normal Vercel build to deploy. No new environment variables or production dependencies are required.
4. Open `/admin/more` → Supported artists. Confirm the page loads without the migration warning.

## How it works

- Unlisted invitation application: `/supported-artists`. Send https://silkcrayon.com/supported-artists directly to selected artists. It is not linked from the homepage, public booking page or sitemap, and carries noindex/nofollow metadata. This is an unlisted link, not an access-controlled invitation token: anyone it is forwarded to can apply, but only owner-approved accounts can book at their agreed supported rate.
- Application asks for name, artist/band, account email, genre, music/social links and project goals. Existing signed-token/honeypot/spam/rate-limit protection is reused. It does not subscribe artists to marketing.
- Owner review: `/admin/supported-artists`. Use Copy application link to invite an artist, or Preview application to inspect the form. Choose Nathan, Billy or another active engineer; set dates and eligible UK-time days/hours. Three months and weekdays 10:00–17:00 are defaults; set them to fit your diary. Five places is an initial recommendation, not a hard-coded limit.
- Approval creates/links a customer record using the application email. Each engineer has a default supported rate. Each artist has an agreed hourly price, minimum session and monthly cap, set on approval. Existing agreements migrate unchanged at £30/hour, two hours minimum and eight hours monthly. This is not a free credit balance or transferable code.
- The artist receives an approval email and signs in to My Studio using that same email. Approved artists see Your supported artist sessions in My Studio (`/account/supported-artists`) to see their engineer, dates, allowance and eligible slots, then pay through Stripe. Standard bookings and prepaid credit purchases remain at their existing prices.
- The assigned engineer can be changed for future bookings by saving the approval again. Previously booked sessions retain their assigned engineer.
- The rate expires automatically by date. Pause blocks new programme bookings immediately; it does not cancel existing paid bookings. Approval emails and retries use the existing email/activity logging; successful Stripe payments use existing booking confirmations, assigned-engineer notifications and reminders.
- Failed decision emails show a warning and can be retried with Resend decision email. A saved approval remains saved if email delivery fails.
- Both pending checkout holds and booked sessions count toward the allowance. Holds expire after 30 minutes. Unused hours do not roll over. The cap is per calendar month, not per rolling 30 days.
- All discounted session dates must be within the approved dates and eligible time window. Only the approved account can use the rate; the server ignores submitted prices/identities and disables combined promotions.
- Programme rescheduling requires contacting the studio. Existing rescheduling paths are blocked for these bookings to prevent bypassing dates/monthly limits. Handle cancellation/refund under the normal policy, then book a fresh eligible session; do not manually restore a cancelled programme booking.
- Recording and production are within booked time; additional editing/revisions are quoted separately. Agree band/live setups before booking. Film/release permissions are discussed separately, not assumed by application.

## Checks performed

- Production Next.js build and existing test suite.
- Programme checkout tests for signed-out/unapproved/paused access, session identity enforcement, server-calculated price, no discount stacking and failed reservations.
- SQL migration executed twice against isolated PostgreSQL, with reservation function and overlap guard: grants, assignment, £30 pricing, occupancy collisions, monthly cap, cancelled sessions, expired holds and protected rescheduling.
- Live Supabase data, real Stripe payment, actual email delivery and browser device rendering were not tested in this environment. After deployment, verify one application → approval → login → eligible booking in your test payment environment before inviting artists.

Run `npm run test:supported-artists` for the included programme checkout regression tests.


## Per-engineer pricing and artist profiles (v20-12-40)

- Owner: OS → Staff → the engineer’s Supported artists · rates & history link. Set Benny’s supported default to £40 here. No particular staff account is matched or changed automatically by name. This default is separate from the public standard studio price (controlled by the existing studio settings).
- An engineer default applies when approving NEW artists; existing agreements retain their own agreed rates. In Supported Artists, select the engineer, use their default or enter an individual override, set monthly hours and minimum session hours, then save. Existing artists can be explicitly updated here, with an email explaining the new terms.
- Monthly allowances can be 1–80 hours; minimum sessions can be 1–8 hours, within that allowance. Individual bookings remain at most eight hours. Your chosen weekdays/time windows still apply.
- Profile summary: active artists, net programme payments, completed hours and upcoming sessions. Expand each artist’s timeline to see their bookings and subsequent agreement changes. Rate/date/status changes are recorded from this migration onward; no historical events are invented.
- Programme spend includes receipts against supported bookings with THAT engineer, minus refunds. It is not engineer pay or the artist’s lifetime spending. Credit/project-funded bookings are excluded to avoid counting non-cash balances as new revenue. Separately billed extras are outside this figure.
- If an artist moves engineers, previous bookings remain attributed to the engineer who delivered/booked them. Former relationships show only that engineer’s own session history. The current monthly quota follows the artist agreement across engineers.
- Engineers have a read-only Supported Artists page from their dashboard and menu. They can only access their own programme/session data. Pricing edits and approvals remain owner-only.
- Existing bookings and Stripe checkout holds retain their original price. Changing an agreement affects new checkouts. An open booking page with a stale rate is rejected at reservation time and must be refreshed; the database stores a per-booking hourly-rate snapshot and supplies the checkout total.
- Migration v40 intentionally blocks the legacy v39 reservation endpoint until the new code is deployed. Apply it immediately before deploying to keep that transition short. Standard full-price bookings are unaffected.
- Patch remains unlisted: no homepage promotion or public sitemap entry. Copy the application link from the OS as before.

Verification: existing tests, new £40 checkout/invalid-rate tests, per-engineer access and net-spend tests; v39→v40 migrations and repeat migration tested in isolated PostgreSQL, including stale price rejection, £40 snapshots, old-price preservation, custom minimum/cap and history events. Live Supabase, Stripe, email and device rendering still require deployment verification.

# Silkcrayon Supported Artists — installation

This is a cumulative patch against the uploaded Silkcrayon project. It includes the latest Meet the Engineers section and the genre copy changes, plus the supported artist programme. It does not deploy or change your live database automatically.

## Install

1. Run `supabase/v20-12-39-supported-artists.sql` in your existing Supabase project's SQL editor. Run this BEFORE deploying the code. The existing studio schema, customer portal, staff roles, reservation functions and overnight booking migration must already be installed.
2. Merge the patch folders into the repository root (the folder containing package.json), replacing matching files. Do not replace entire app/components/public folders with these partial folders.
3. Commit/push and allow the normal Vercel build to deploy. No new environment variables or production dependencies are required.
4. Open `/admin/more` → Supported artists. Confirm the page loads without the migration warning.

## How it works

- Public programme and application: `/supported-artists`, also linked from the homepage.
- Application asks for name, artist/band, account email, genre, music/social links and project goals. Existing signed-token/honeypot/spam/rate-limit protection is reused. It does not subscribe artists to marketing.
- Owner review: `/admin/supported-artists`. Choose Nathan, Billy or another active engineer; set dates and eligible UK-time days/hours. Three months and weekdays 10:00–17:00 are defaults; set them to fit your diary. Five places is an initial recommendation, not a hard-coded limit.
- Approval creates/links a customer record using the application email. It grants £30/hour access with a two-hour minimum and eight hours per calendar month. This is not a free credit balance or transferable code.
- The artist receives an approval email and signs in to My Studio using that same email. Choose Supported artist sessions (`/account/supported-artists`) to see their engineer, dates, allowance and eligible slots, then pay through Stripe. Standard bookings and prepaid credit purchases remain at their existing prices.
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

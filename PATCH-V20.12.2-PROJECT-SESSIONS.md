# Silkcrayon OS v20.12.2 — Project Sessions Patch

Apply after v20.12.1.

## Run first
`supabase/v20-12-2-project-sessions.sql`

## What changes
- Recording fee and post-production fee are explicit separate quote lines.
- Project total is derived from recording + post-production, avoiding ambiguous double counting.
- Podcast enquiry conversion creates/links the customer record automatically where possible.
- A project can contain multiple calendar recording sessions.
- Project sessions are billed as **included in the project quote**, not as a second session charge.
- Customer project-session confirmation reinforces that editing/mixing is separate unless agreed.
- Completing a linked session recalculates project hours used from actual session reports.
- Project page shows recording allowance, used hours, remaining hours, linked sessions and separate commercial scope.

## Important
Project recording sessions should be created from **Project → Add project session**, not as ordinary paid studio bookings. This avoids double-counting revenue.

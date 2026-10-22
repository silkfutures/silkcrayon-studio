# Silkcrayon OS — dashboard performance patch

Based on the source zip uploaded 22 October 2026.

## Installation
Copy `app/admin/page.js` into the same path in your project, then commit and deploy to Vercel. Back up the previous file. This patch changes only one file. No SQL migrations or environment variables are required.

## What changes
- Historical receipt data used by the admin overview is cached server-side for **60 seconds** across requests, instead of re-fetching all bookings, payments and mix jobs on every page load.
- Website visitor metrics are cached for **5 minutes**.
- Customer bookings, assigned engineers, upcoming sessions, and operational actions remain live, and aren't cached by this patch.

## Trade-offs
- Dashboard revenue figures can be up to 60 seconds behind. Visitor counts can be up to 5 minutes behind. The underlying accounting and booking records are unchanged.
- Initial cold requests still need the full history scan. The existing `page_views` query may only see the first 1,000 records under Supabase's default maximum row limit, so its unique visitor count may be inaccurate at high traffic. A database-side distinct count is the longer-term solution.
- This targets the owner dashboard only; it does not speed up other admin pages, slow database connections, or delayed third-party APIs.

## Diagnose production
While logged in as owner, open `/api/admin/speed` on your live site. It reports authentication latency, DB latency, row counts and full-history scan time. **It deliberately runs a full uncached history test**, so don't refresh it repeatedly.

## Verification
1. Deploy patch to preview first.
2. Check `/admin` loads and shows revenue and upcoming bookings.
3. Change a booking and verify the booking status updates immediately; revenue may lag up to 60 seconds.
4. Measure the repeat navigation speed after the first visit.

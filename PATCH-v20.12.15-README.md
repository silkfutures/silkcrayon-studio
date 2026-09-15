# Silkcrayon audit patch — v20.12.15

Based on the supplied v20.12.14 archive. This is a focused correctness and navigation patch, not the entire redesign roadmap.

## Install

1. Keep a copy of your current source and database backup. Test this patch in staging first.
2. Extract the patch ZIP and copy the CONTENTS of `files/` over your existing project root, keeping the folder structure. No files need deleting. Alternatively, use the complete source ZIP as your source checkout.
3. In Supabase SQL Editor, run `supabase/v20-12-15-receipt-dates.sql` once against the project's existing database before deploying. It adds a nullable booking payment timestamp and a trigger for future payments. It does not backfill or delete existing records. The script can be rerun.
4. Keep your existing environment variables. Run `npm ci`, then `npm run build` (which also runs all tests). Deploy through your usual process.
5. Check owner and engineer logins, Today/Calendar/Artists/Money/More, Settings under More, and a test booking paid through its payment link. Confirm the receipt appears once in Accounting and CSV. Confirm extra-time payments still appear separately.

The `.patch` file is an alternative for developers: from the unchanged supplied project, run `git apply --check silkcrayon-v20.12.15.patch`, then `git apply silkcrayon-v20.12.15.patch`. Use either this or the files overlay, not both.

## Included changes

- Shared receipt calculation for owner overview, owner summary on engineer home, Accounting, and its CSV export.
- Booking/payment duplicates are matched using booking ID plus Stripe payment-intent or checkout-session identity. Separate extra-time receipts are preserved. Mirrored refund amounts are counted once. Unknown historical relationships are not guessed from booking ID alone.
- Included project bookings and credit-funded sessions are excluded from new booking collections.
- Both owner revenue summaries include paid mix jobs. Reporting uses payment dates where recorded, with explicitly marked creation-date estimates for older booking/studio-payment receipts. Undated mix payments remain undated.
- Receipt queries paginate and raise recoverable errors rather than silently truncating totals or treating a failed query as zero.
- Five primary OS destinations: Today, Calendar, Artists, Money, More. Role-aware Home and installed-app launch, active navigation states, owner-only New Booking action, Settings and session tools under More.
- Legacy Customers list redirects to Artists. Individual customer records remain accessible.
- London calendar dates in owner/engineer dashboards and session lifecycle checks.
- Recoverable OS error page. Availability infrastructure failures return 503 instead of 429; real rate limits still return 429.
- Consistent public menus, mobile focus trapping, Escape dismissal and focus restoration. Service numbering fixed; the Services directory includes Dry Hire, Full Day and a Young Creators link.
- Build runs all four existing tests plus the new receipt/navigation regression suite.

## Validation

- `npm ci` using the supplied npm lock: passed. No dependency upgrades; package versions are unchanged apart from the app release number.
- `npm run build`, including import checks and all tests: passed on Next 16.3.4.
- Tests cover linked receipts, separate extras, mirrored refunds, credit/project exclusions, mix receipts, estimated dates, London month boundaries, one active navigation item per role, receipt pagination and database failure handling.
- Local mobile browser check: menu opens with focus on its first link; reverse Tab wraps within the controls; Escape closes and returns focus to the toggle. Public navigation renders with the new links.
- Local availability endpoint with missing database configuration returns 503 and a useful outage message.

## Limits and follow-up

No credentials were provided, so the migration has not been executed against PostgreSQL and authenticated OS rendering, payments, notifications and exports have not been exercised against real records. Verify those in staging before production.

Historical payment dates cannot be recovered from source alone. The migration records the time a booking becomes paid going forward; older missing dates stay estimated. Existing net-revenue reports apply refunds to their original receipt period; this is not a new cash-movement ledger. The separate Analytics screen retains its existing metric definitions in this patch.

This patch does not restructure the whole homepage, replace the booking wizard, merge CRM data, redesign all OS screens, or implement the later action-inbox roadmap. Receipt loading is paginated for correctness but still reads receipt source history; a database reporting view would be the next scaling step for a large dataset.

Rollback: restore your prior source/deployment. The nullable column can safely remain; stop the new timestamp behaviour with `drop trigger if exists bookings_stamp_paid_at on public.bookings;`. Do not drop historical data merely to roll back the UI.

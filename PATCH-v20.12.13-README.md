# Artist Development price + service-aware Apple calendars

The Artist Development service card now displays `£75 · 60 minutes` before and after selection.

Each connected Apple calendar now has **Services allowed during these events** controls. Dry Hire is preselected when adding a calendar. Existing calendars remain fully blocking until you tick Dry Hire (or Artist Development); saving the checkbox automatically resyncs that calendar.

Apple events can be ignored per service, but Studio OS bookings and manual blockouts always block every service. Overlapping Apple calendars remain safe: every overlapping calendar must allow the service.

## Deploy

1. Run `supabase/v20-12-13-service-aware-calendar.sql` in Supabase SQL Editor.
2. Deploy the app.
3. Open **Studio OS → Calendar**, tick **Dry Hire** under the connected calendar, and wait for the saved/synced confirmation.

No new environment variables are required.

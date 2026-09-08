# V20.12.10 — Apple Calendar availability blocking

- Connect multiple existing Apple/iCloud calendars from Admin → Calendar.
- Busy events become privacy-safe Studio OS blockouts; customer-facing availability never receives event titles.
- Supports recurring events, exceptions, moved instances, time zones, all-day events and optional before/after buffers.
- Calendars can be paused, resumed, synced manually or disconnected independently.
- A dedicated cron refreshes connected calendars every 15 minutes.
- Existing Studio OS → Apple subscription remains available, creating two-way calendar behaviour.

## Deploy

1. Run `supabase/v20-12-10-apple-calendar-blocking.sql` in Supabase SQL Editor.
2. Deploy the code to Vercel.
3. Keep `CRON_SECRET` configured. Optionally add a strong `CALENDAR_SYNC_ENCRYPTION_KEY`; otherwise the existing Supabase server secret derives the encryption key.
4. In Admin → Calendar → Apple Calendar sync, connect each required Apple public-calendar subscription link.

Do not change or remove the encryption secret after calendars are connected; doing so makes their stored links unreadable until reconnected.

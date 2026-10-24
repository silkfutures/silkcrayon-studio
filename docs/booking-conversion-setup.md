# Silkcrayon website conversion improvements

## Deploy order
1. Run `supabase/v20-12-54-booking-conversion-funnel.sql` in Supabase SQL Editor first. It creates a private anonymous funnel table. Do not enable the feature without this migration.
2. Inspect the Vercel preview. Test the booking page for vocal recording, voiceover and dry hire on mobile and desktop. Confirm that selecting a date without availability offers alternative dates.
3. Merge the feature branch into `main` only after preview review; production deployment follows your existing Vercel Git integration.
4. Open OS → Analytics → Studio Pulse and allow new activity to accumulate. Old events are not retroactively created.

## Changes
- Booking flow shows only the essential contact fields by default; genre, Instagram, preferred engineer and creative notes are optional in one compact panel.
- When a day has no sessions, a bounded API offers the next three days with available sessions in a following 15-day window.
- Anonymous funnel events: booking page view, service selection, slot selection, no availability, Stripe checkout start and verified paid booking.
- Stripe remains the only authority for the paid event. The webhook ignores analytics failures; neither payments nor engineer assignment depend on tracking.
- OS Analytics now shows measured website checkout stages separately from legacy scheduled-date studio KPIs. Marketing UTM source is carried anonymously through the booking flow.

## QA checklist
- [ ] Supabase SQL applied successfully
- [ ] Booking form validates name/email and dry-hire requirements
- [ ] Optional creative panel can remain closed and checkout still works
- [ ] Calendar, time availability and next-date suggestions work
- [ ] Stripe test payment results in exactly one paid event, including after webhook retries
- [ ] OS analytics displays booking views, selected times, checkouts and paid events
- [ ] Owner and engineer booking workflows remain unchanged
- [ ] Review the site's privacy notice for the additional pseudonymous event and campaign tracking

## Limitations
- New funnel counts only include activity after deployment and do not backfill prior bookings.
- A reporting window can contain checkouts paid in the next window. Funnel percentages are operational indicators, not fully cohort-attributed conversion rates.
- Vercel Web Analytics does not currently expose data for this project; this feature uses your existing Supabase-backed Studio Pulse.

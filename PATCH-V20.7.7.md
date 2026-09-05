# Silkcrayon Studio OS — V20.7.7

## Artist editing
- Owner can edit an existing artist/customer record from the profile page.
- Editable: full name, artist name, email, phone, Instagram/social, genre/style, area and goals/notes.
- Phone updates immediately feed Call/Text, reminders and delivery workflows.

## Studio Dry Hire
- New public service: Studio Dry Hire at £40/hour with a 2-hour minimum.
- Booking flow supports 2–8 hours, hides preferred engineer, and requires separate Dry Hire Terms acceptance.
- New `/dry-hire-cardiff` marketing/SEO landing page.
- New `/dry-hire-terms` terms page.
- Dry hire is identified in Studio OS and does not count as an unassigned-engineer problem.
- Reminder automation does not auto-assign an engineer to dry hire.
- Dry-hire confirmation/reminder communications explain that no Silkcrayon engineer is included.
- Additional dry-hire overtime defaults to £40/hour.
- Dry hire is intentionally excluded from prepaid studio-hour credits.

## Owner revenue tracker
- The mobile Home dashboard (`/admin/engineer`) now shows an owner-only Revenue panel.
- Shows collected this month, last month, change, upcoming booking value and still-to-collect.
- This fixes the mismatch where the desktop `/admin` overview had revenue data but the bottom-nav Home screen did not.

## Migration
Run `supabase/v20-7-7-dry-hire.sql` after V20.7.6.1.

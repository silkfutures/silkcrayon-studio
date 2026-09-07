# Silkcrayon OS v20.12.4 — quote breakdown + project deletion

Apply on top of v20.12.3.

## Before deploy
Run `supabase/v20-12-4-project-price-breakdown.sql` in Supabase SQL Editor.

## Changes
- Podcast/project quotes now price four explicit line items:
  - Audio recording
  - Video production
  - Audio post-production
  - Video post-production
- Video production no longer changes/replaces the audio recording rate.
- Quote total includes only priced line items; blank/TBC post-production is not silently included.
- Existing project quotes are preserved by the migration and mapped into the new fields.
- Legacy aggregate recording/post/total columns remain synchronized for existing reporting paths.
- Project detail shows each production stage separately.
- Project editor can change each line item independently.
- Adds `Delete project` with confirmation. Deleting a project preserves customers and linked sessions; booking links are cleared by the existing `ON DELETE SET NULL` foreign key.

## Suggested test
1. Open a podcast enquiry and create a quote/project.
2. Confirm audio recording remains at the audio guide even when video is enabled.
3. Add a video production amount and leave video post blank/TBC.
4. Confirm the total only sums priced line items.
5. Save/change all four line items on the project page.
6. Create a test project, optionally link a session, delete the project and confirm the session remains in Sessions.

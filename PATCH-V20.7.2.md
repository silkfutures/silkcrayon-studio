# Silkcrayon Studio OS — V20.7.2

## Reminder + engineer safety
- Upcoming unassigned sessions are now visible in the main dashboard regardless of payment state.
- Upcoming table includes unassigned bookings instead of hiding them.
- Session view shows an explicit `Engineer not assigned` warning.
- Calendar event metadata also shows `UNASSIGNED`.
- The day-before reminder automation now assigns the default active owner/engineer before composing the reminder if the booking is still unassigned.
- Optional `DEFAULT_ENGINEER_USER_ID` can pin the fallback to a specific staff profile. If unset, the first active owner is used.
- Reminder SMS therefore includes that engineer's name and phone when the staff profile has a phone number.

## Session contact actions
- Customer phone number in View Session is now actionable with `Call` (`tel:`) and `Text` (`sms:`) buttons.

## Calendar UX
- Apple Calendar subscription UI moved below the actual Studio OS calendar and is collapsed by default.
- Mobile Month view is now a true 7-column month grid instead of horizontally-scrolling day cards.
- Week view remains a swipeable day-card view on mobile.

## Studio Finish pricing
- Studio Finish can now be quoted per track from the live session upsell panel.
- Staff payment screen also exposes the Studio Finish quote amount.
- Admin payment API accepts the staff-entered Studio Finish amount (minimum £20) instead of always forcing the global default.
- Global Studio Finish price remains the starting/default quote.

## File delivery
- View Session now includes a `Deliver the work` panel.
- Staff can either paste an external file link or upload a finished file.
- Uploads go directly from the browser to a private Supabase Storage bucket using a signed upload URL, avoiding Vercel request-body limits.
- Each delivery gets a secret customer delivery link at `/files/[token]`.
- Silkcrayon sends the customer an email and transactional SMS when the files are ready.
- Delivery email includes a separate honest Google review request (when `GOOGLE_REVIEW_URL` is configured) and a rebooking CTA.
- New migration: `supabase/v20-7-2-session-deliveries.sql`.

## Google review incentive
A £5 discount was intentionally **not** tied to leaving a 5-star Google review. Google prohibits discounts or other incentives in exchange for reviews and also prohibits selectively soliciting positive ratings. The app asks for an honest review separately from the booking CTA.

## Validation
- `npm run check:imports` — PASS
- `npm run test:contracts` — PASS
- Full Next.js production build not run because dependencies are not installed in the supplied source archive.

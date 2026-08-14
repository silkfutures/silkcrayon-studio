# Silkcrayon OS V19

## Policy + consent layer
- Added FAQ, Terms & Conditions, Privacy Policy, Cancellation & Refund Policy and No Harmful Music Policy.
- Booking acceptance now links all policies and stores exact policy versions, acceptance timestamp, request IP and user agent.
- Marketing consent remains separate and optional.
- Studio Finish: £60/song, delivery within 7 days, one revision included.
- Files: retained up to 12 months.
- Cancellation rules: one free reschedule >48h; 24–48h studio credit; <24h non-refundable; no-show forfeits value.

## Mobile viewport
- Added Next.js viewport metadata with device-width, viewport-fit=cover and zoom locked to stop the booking page shrinking to a desktop-width canvas on mobile.
- Added horizontal overflow protection.

## Deploy
1. Run `supabase/v19-policy-consent.sql` once in Supabase SQL Editor.
2. Deploy this build to Vercel.
3. Test a booking and verify the new version fields are populated on the booking row.

Policy copy is operational website copy and should be reviewed by a UK solicitor/privacy professional before relying on it as legal advice.

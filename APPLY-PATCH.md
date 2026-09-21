# Silkcrayon v20.12.36 — AI Call Prep

## What this adds

- Automatically prepares useful bookings and website enquiries after they arrive.
- Shows a 10-second brief, call objective, key expectation, questions, a full phone script, preparation tasks and after-call actions.
- Adds **Call customer**, **Copy**, **Regenerate** and checklist controls.
- Uses the booking or enquiry already stored in the OS; email addresses and phone numbers are not sent to the model.
- Caches each result and regenerates only when the source details change or a staff member presses **Regenerate**.
- Keeps recording time, post-session Studio Finish and podcast post-production clearly separated.

## Apply

1. Upload the folders and files in this patch over the repository root, preserving their paths.
2. Run `supabase/v20-12-36-ai-call-prep.sql` in the Supabase SQL editor.
3. Add `OPENAI_API_KEY` to the Vercel project environment variables for Production, Preview and Development.
4. Optional: add `OPENAI_CALL_PREP_MODEL` to override the default `gpt-4o-mini` model.
5. Redeploy.

## Where it appears

- **Bookings:** open a session from the owner/engineer dashboard. AI Call Prep appears directly below the session brief.
- **Enquiries:** open **Enquiries**. Each enquiry has its own AI Call Prep card.

New enquiries and completed paid bookings generate in the background when the customer request finishes. Older bookings with a meaningful note generate when opened. Existing enquiries can be prepared with **Create call prep**.

## Verification

- `npm run build` passes, including the existing import and regression test suite.
- The patch does not require a new npm package.

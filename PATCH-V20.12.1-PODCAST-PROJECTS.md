# Silkcrayon Studio OS — V20.12.1 Podcast Projects + split pricing

Run `supabase/v20-12-podcast-projects.sql` **before deploying this patch**.

## What this patch adds
- Splits Podcast Recording from Audiobooks & Voiceover in the enquiry flow.
- Captures speakers, episode count/length, estimated recording hours, video, post-production requirements and target dates.
- Adds Projects & Quotes to Studio OS for multi-session work.
- Converts an enquiry into one project with a recording-hour allowance and project status pipeline.
- Podcast recording guides start at £65/hour audio, £55/hour for 10h+ volume recording, and £90/hour video recording/production; owner can override every quote.

## Important pricing rule
**Recording and post-production are separate line items.**

Recording fee = booked studio time + recording engineer + organised raw audio/files.

Post-production fee = any editing, mixing, mastering, episode assembly, clean-up, exports and video editing. It is not included in the recording fee unless explicitly added to the project quote.

The public podcast enquiry/service copy now states this clearly. Studio OS also keeps `recording_amount_pence` and `post_amount_pence` separate and calculates the displayed total from those two amounts.

For Dylan's enquiry, for example, the £1,000 can remain the **recording fee for up to 18 hours**. Editing/mixing can stay `TBC` until scope is agreed, then be added as a separate post-production amount.

## Validation
- Relative import check should pass with `npm run check:imports`.
- Existing contract tests are unchanged.

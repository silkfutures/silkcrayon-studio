# Silkcrayon Studio OS — V20.12.1 PATCH

This ZIP is a delta patch only. It does **not** contain the whole project.

## Apply
1. Run `supabase/v20-12-podcast-projects.sql` in Supabase first.
2. Overlay the `silkcrayon-studio-main/` folder in this ZIP onto the current project, replacing matching files and adding new files.
3. Deploy normally.

## Pricing rule added
Podcast **recording** and **post-production** are separate charges.

- Recording = booked studio time + recording engineer + organised raw files.
- Post-production = editing, mixing, mastering, episode assembly/cleanup, exports and video editing.
- Post-production is never implied to be included in the recording fee. It is a separate line item/TBC until quoted.
- Studio OS stores and displays the recording fee and post-production fee separately, then totals them.

## Changed files
- `PATCH-V20.12.1-PODCAST-PROJECTS.md`
- `app/admin/leads/page.js`
- `app/admin/more/page.js`
- `app/admin/projects/[id]/page.js`
- `app/admin/projects/page.js`
- `app/api/admin/leads/[id]/project/route.js`
- `app/api/admin/projects/[id]/route.js`
- `app/api/enquiries/route.js`
- `app/globals.css`
- `app/page.js`
- `app/podcast-recording-cardiff/page.js`
- `app/services/page.js`
- `components/AdminNav.js`
- `components/EnquiryForm.js`
- `components/LeadProjectActions.js`
- `components/ProjectControls.js`
- `lib/podcastPricing.js`
- `package.json`
- `supabase/v20-12-podcast-projects.sql`

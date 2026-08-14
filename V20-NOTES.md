# V20 — Final pre-migration conversion build

- Replaces homepage blank-email service enquiries with structured forms.
- Mixing/Studio Finish enquiry form.
- Audiobook/Podcast/Voiceover enquiry form.
- Bespoke/general enquiry infrastructure.
- Request a Call flow using Morning/Afternoon/Evening preference, not fixed appointment slots.
- New `leads` CRM table and owner Enquiries dashboard.
- Website enquiries capture structured lead data before conversion to a customer/artist.
- Homepage call-request CTA.
- Enquiry/request-call URLs added to sitemap.

## Deploy
1. Run `supabase/v20-leads.sql` in Supabase SQL Editor.
2. Deploy the project to Vercel.
3. Test each homepage Enquire link and Request a Call on mobile and desktop.
4. Confirm submissions appear at `/admin/leads`.

# Silkcrayon v20.12.34 — SEO authority pass + manual mix approval

Apply this patch over the current app (after v20.12.33).

## What it changes

### SEO
- Expands the existing `/mixing-mastering-cardiff` page instead of creating duplicate SEO pages.
- Strengthens `/recording-studio-cardiff` with useful customer FAQs and stronger internal linking.
- Adds visible FAQ content + FAQPage JSON-LD to supported SEO pages.
- Adds Service structured data to the existing Cardiff service landing pages.
- Adds `/dry-hire-cardiff` to the sitemap.
- Improves Dry Hire canonical/Open Graph metadata and adds Service structured data.
- Adds Mixing & Mastering and Dry Hire to the SEO-page footer links while leaving the main navigation uncluttered.

### Mix OS
- Adds **Mark mix as approved ✓** inside a mix job after a version has been sent for review.
- Intended for approval received by text, email, phone or in person.
- Requires the mix to be fully paid and in First mix sent / Revisions.
- Updates the job and track statuses to Approved and records the manual approval in Communication History.
- Does not send a fake client-approval notification to you or the customer.

## Database
No Supabase migration required.

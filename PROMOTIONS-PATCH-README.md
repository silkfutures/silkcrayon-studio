# Promotions Control Patch

This patch sits on top of V20.4.9 + the Inline Offers patch.

## What changes
- Starburst-style promotional badge instead of a plain pill.
- Dynamic homepage promotion banner.
- Owner control at `/admin/promotions`.
- Promotions also appear against matching booking durations automatically.
- Checkout pricing reads the active promotion from the database, so turning a promotion OFF removes both the marketing and the discounted checkout price.
- The existing 2 Hours for £100 relaunch offer is seeded as the first promotion.

## Install
1. Upload the patch files into their matching paths in GitHub.
2. Run `supabase/v20-4-9-promotions-control.sql` once in Supabase SQL Editor.
3. Redeploy / let Vercel redeploy automatically.
4. Open Studio OS → More → Promotions.

No full-project upload is required.

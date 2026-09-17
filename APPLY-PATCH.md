# Silkcrayon v20.12.27 — Mix delivery + customer review flow

Apply this patch over the current Silkcrayon app, preserving the paths in the ZIP.

## What changes

- Mix deliveries accept multiple files in one send.
- Files are uploaded individually to the existing secure storage and presented to the customer behind one private review link.
- The admin uploader has a cleaner multi-file queue with file count, total size, individual remove controls, and an Add more files action.
- The customer review page makes **Approve mix** the primary action.
- Revision requests are deliberately secondary/collapsed under **Need a specific change?** and prompt for focused notes/timestamps.
- Approval and revision requests notify the Silkcrayon owner email(s).
- Approval and revision requests are also recorded in mix activity/history.
- Signed-in customers get the same approval/revision workflow in their portal.
- Old mix review links are prevented from approving an outdated version once a newer delivery exists.
- Multi-file secure downloads are supported individually from the customer page.

## Database

No Supabase migration is required. This uses the existing `mix_jobs`, `mix_revisions`, `mix_activity`, and `session_deliveries` tables.

## Files replaced/added

- `components/MixDeliveryPanel.js`
- `components/MixDeliveryPanel.module.css`
- `components/PublicMixReviewActions.js`
- `components/ClientMixActions.js`
- `components/MixReviewActions.module.css`
- `app/api/admin/mixes/[id]/delivery/route.js`
- `app/api/mix-review/[token]/route.js`
- `app/api/customer/mixes/[id]/route.js`
- `app/files/[token]/page.js`
- `app/files/[token]/download/route.js`

## Important

This patch does not include or replace the booking/deposit/Dry Hire files from v20.12.26, so it should not undo those changes.

# Apply this patch to Silkcrayon Studio OS

**Patch:** v20.12.17 — deposits / part payments + Monzo balance reminders  
**Base expected:** v20.12.16 hotfix (customer picker + multi-file delivery)

This archive is **patch-only**. It does not contain the whole application.

## Apply
1. Unzip this patch.
2. Copy its contents into the **root of your existing Silkcrayon app**, preserving the folders.
3. Allow these files to **replace/overwrite** the versions already in the project.
4. In Supabase SQL Editor, run:
   `supabase/v20-12-17-part-payments-monzo-reminders.sql`
5. Commit/deploy the project to Vercel as normal.

## What it adds
- `Deposit / part paid` when adding a manual session.
- Amount already received + payment method.
- Automatically calculated outstanding balance.
- Balance reminder date.
- Optional Monzo Business payment-link field for the exact remaining amount.
- Daily email/SMS reminder automation.
- `Mark as paid` records only the outstanding amount and closes the reminder.
- Part-payment / outstanding-balance display across the relevant admin/customer views.

## Important
This patch assumes the v20.12.16 hotfix is already in your app. It intentionally contains only changed/new files.

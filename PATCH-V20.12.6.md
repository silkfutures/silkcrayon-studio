# Silkcrayon OS v20.12.6 — Mixes pipeline

Incremental patch for a current v20.12.5 installation.

## Install

1. Copy the patch contents over the project root, preserving paths.
2. Run `supabase/v20-12-6-mixes-pipeline.sql` in the Supabase SQL editor.
3. Redeploy.

## What changed

- Dedicated Mixes navigation and owner pipeline.
- Mix only, mix + master and master only services, with vocal tuning/editing and stem-delivery add-ons.
- Customer, track, quote, payment due date, source-files state, references and notes.
- Database-enforced payment gate: unpaid jobs cannot enter the active pipeline, accept revisions or deliver files.
- Awaiting payment, paid/ready, mixing, first mix sent, revisions, approved and delivered stages.
- Numbered revision notes and delivery history.
- Existing `session_deliveries` table, private storage bucket, secure download page and expiry flow reused for mix files.
- Quoted, paid and outstanding values kept separate; paid mix revenue appears in the owner revenue breakdown.
- Due/overdue mix-payment reminders on the owner dashboard.

## Verification

- `npm run check:imports`
- `npm run test:contracts`
- `npm run build`

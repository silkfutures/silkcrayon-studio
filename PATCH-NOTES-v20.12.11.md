# V20.12.11 — previous-system credit import

- Owner-only credit import on each artist profile.
- Records the old amount and unique order/voucher reference for audit without counting it as new Studio OS revenue.
- Adds hours directly to the artist's email-linked balance.
- Emails the artist that their hours are ready.
- Duplicate order references are rejected to prevent double-crediting.

Run `supabase/v20-12-11-legacy-credit-import.sql` before deploying the code.

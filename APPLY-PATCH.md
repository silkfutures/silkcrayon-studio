# Silkcrayon v20.12.28 — mix review build hotfix

Apply this on top of v20.12.27.

Replace:

`app/api/mix-review/[token]/route.js`

This fixes two relative imports that were one directory too high:

- `lib/supabase`
- `lib/notifications`

No database migration is required.

Verification performed against the latest uploaded app with v20.12.27 overlaid:

- `npm run check:imports` → `Relative imports OK`
- corrected route passes `node --check`

The full local test suite could not be completed in the container because its cached `node-ical` package is incomplete; that is unrelated to this hotfix and is not the Vercel error being fixed.

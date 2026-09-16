# Silkcrayon v20.12.22 — build audit fix

Apply over your current app (after v20.12.19+).

Replace only:

- `tests/audit-patch.mjs`

Why this is needed:

- v20.12.19 intentionally changed the owner **Today** destination from `/admin` to `/admin/engineer` so owners and engineers share the session-focused Today view.
- The regression test still expected the old owner route `/admin`, so Vercel stopped during `npm test` before the Next.js build.
- This patch updates that stale assertion to expect `/admin/engineer` for both roles.

No application code, database, or Supabase migration changes are included.

Verification performed:

- `node tests/audit-patch.mjs` passes with the current navigation behavior.

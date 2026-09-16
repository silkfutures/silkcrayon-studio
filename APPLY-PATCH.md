# Silkcrayon combined patch — v20.12.23

This is a patch-only bundle. Apply it over your current Silkcrayon app by copying the folders/files into the project root and replacing the matching files.

## Included fixes

1. **Today / Session View navigation**
   - Owner Today route uses `/admin/engineer`.
   - More navigation stays consistent.
   - Includes the regression-test update so Vercel does not fail expecting `/admin`.

2. **Create a Mix customer menu**
   - Selecting an artist/customer collapses the search menu immediately.
   - Dismisses the mobile keyboard and preserves the selected customer.

3. **Automations → File Delivery**
   - File-delivery history is collapsed by default.
   - It can be expanded when needed so Recent Messages stays easy to reach.

## Files replaced

- `lib/osNavigation.js`
- `app/admin/more/page.js`
- `tests/audit-patch.mjs`
- `components/ArtistSearchSelect.js`
- `app/admin/automation/page.js`
- `app/globals.css`

## Database

No Supabase migration is required for this bundle.

## Important

This bundle combines v20.12.19 (build-safe), v20.12.20, and v20.12.21. It does **not** include the separate deposit/Monzo or editable-balance patches; keep those already-applied files in your project.

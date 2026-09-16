# Silkcrayon v20.12.19 — Today = Session View

Apply this patch over your current v20.12.18 app.

Replace these two files:

- `lib/osNavigation.js`
- `app/admin/more/page.js`

What changes:

- **Today** now opens `/admin/engineer` for owners as well as engineers.
- The owner dashboard at `/admin` is still available under **More → Owner overview**.
- The duplicate **More → Session view** tile has been removed.
- No database or Supabase migration is required.

After replacing the files, redeploy normally.

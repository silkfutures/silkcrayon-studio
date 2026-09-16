# Silkcrayon v20.12.20 — Mobile customer picker hotfix

This is a **patch-only** release.

## What it fixes

On the **Create a mix** form, tapping a customer on iPhone/iOS could visually select/highlight the row but leave the customer results menu open, blocking the rest of the form.

The picker now:

- collapses immediately when a customer is tapped;
- keeps an immediate local selected value while the parent form updates;
- compares customer IDs safely as strings;
- dismisses the iOS keyboard after selection; and
- removes the `onMouseDown(...preventDefault())` behaviour that can suppress the synthetic click on mobile Safari.

## Apply

Replace this file in your existing app:

`components/ArtistSearchSelect.js`

with the file from this patch.

No Supabase/database migration is required.

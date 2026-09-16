# v20.12.24 — Mix customer picker hard-collapse hotfix

Apply this **after v20.12.23**.

Replace:

- `components/ArtistSearchSelect.js`

No Supabase migration is required.

## What changed

The previous fix still allowed a stale mobile focus/open event to keep the customer results visible after selection.

This version makes a committed customer selection authoritative:

- if a customer is selected, the results list cannot render, even if `open` is accidentally still true;
- touch/pointer selection commits on `pointerup` rather than relying only on Safari's synthetic `click`;
- normal click/keyboard activation remains as a fallback;
- tapping **Change** clears the selection and deliberately reopens the search list.

This affects all uses of the shared customer picker, including **Create a Mix**.

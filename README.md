# Silkcrayon visual refresh — staged patch

Apply to the **latest** GitHub main branch, preserving existing files where not listed. This is UI-only except for the mix-offer email markup. No SQL is required.

Files:
- `app/admin/layout.js` imports the new scoped CSS.
- `app/admin/os-design-refresh.css` introduces restrained admin styling and responsive mix page styles.
- `components/MixCreateDrawer.js` adds the compact `+ Create mix` action, opening the existing creation form only when needed.
- `app/admin/mixes/page.js` puts creation above existing mixes, with active work first.
- `lib/mixOfferEmail.js` provides branded, responsive, accessible email HTML.
- `app/api/admin/mixes/[id]/offer/route.js` uses that template and continues to send the same engineer offer notification.

**Important version caveat:** Files were assembled using the uploaded studio snapshot and the latest mix-offer patch available in this conversation. If the relevant files have changed in GitHub since then, merge changes rather than replacing them wholesale. In particular, retain any changes to offer route logic and `app/admin/mixes/page.js` made after those patches.

This does not remodel booking/session detail screens, all email types or the mix creation backend engineer assignment: these require a subsequent controlled integration with the live repository. Engineers can still be offered a job on the mix detail page.

Verify: `npm run build`, offer email generation, create-mix drawer open/close, mobile navigation, existing Stripe and client emails, then preview in Vercel. No customer emails are sent just by installing this patch.

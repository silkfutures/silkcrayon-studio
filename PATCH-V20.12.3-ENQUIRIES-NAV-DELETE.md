# Silkcrayon OS v20.12.3 — Enquiries navigation + delete

Apply on top of v20.12.2. No database migration required.

## Changes
- Adds **Enquiries** to the owner **More** menu directly above **Projects & quotes**.
- Adds **View enquiries →** to the empty Projects screen.
- Makes the per-enquiry delete action explicit: **Delete enquiry** rather than **Delete spam**.
- Delete confirmation explains that existing booked customer records are preserved.
- Keeps the separate bulk **Delete obvious spam** cleanup action.

## Files
- `app/admin/more/page.js`
- `app/admin/projects/page.js`
- `components/LeadSpamActions.js`

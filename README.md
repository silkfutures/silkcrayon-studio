# Silkcrayon OS: fixed mobile navigation + mix tabs

## Apply to latest repository
Copy the 5 changed files into their matching paths:
- `components/StaffBottomNav.js` — renders the bottom navigation in the document body, outside layout transforms that cause incorrect fixed positioning.
- `components/MixTabs.js` — accessible horizontal tabs.
- `app/admin/mixes/[id]/page.js` — replaces all six mix accordions with tabs, and adds a dedicated Engineer offer tab.
- `app/admin/mixes/[id]/mix-layout.css` — tab styles and mobile overflow handling.
- `app/admin/os-navigation-v2.css` — forces the portaled nav to the visible screen bottom.

This patch assumes the earlier Clean OS & Mix Offers patch and OS Reorganisation patch were installed. If the project has subsequently changed the same files, merge rather than overwrite those changes. No database changes. Preview-test mobile Safari/Chrome and verify tabs contain the expected forms and controls. The previous navigation build test fix should remain in place.

# V20.7.1 — Session context + calendar views + manual payment

- Public booking form now captures an optional Instagram / social handle and saves it to the existing customer `instagram` field.
- Engineer/owner session detail now leads with a Session brief showing booking genre/style, customer note and a clickable Instagram/social link.
- Engineer dashboard always says `View session` instead of `Start session`.
- Owner upcoming-session table now includes payment state, a `Mark as paid` control, and a direct `View session` link.
- Session detail also exposes `Mark as paid` to owners when payment is due.
- OS calendar now supports Week / Month / Agenda views, opens to Week by default, and includes a Today shortcut.

Validation: `npm run check:imports` and `npm run test:contracts` pass. Full `npm run build` was not executable in the supplied archive because node dependencies were not installed (`next: not found`).

# v20.12.45 — Engineers only see what they need on a session

**Hidden from engineers on the session page:**
- AI call prep
- Download invoice / receipt PDF, Email PDF to customer, previously generated PDFs
- Payment amounts: engineers now just see "Session paid / Prepaid hours / Payment outstanding — the studio will collect it"
- The booking activity log (it can contain refund and payment notes)
- The "engineer not assigned" owner warning

On the Today list, engineers see "Paid / Payment due" without the £ amount.

**Blocked on the server too, not just hidden:**
- `/api/documents/...` returns 403 for engineers (owner and the artist themselves still work).
- AI call prep is owner-only.

**Engineers still see:**
- The artist brief: name, call/text buttons, genre, Instagram, what they're making
- Their session offer and their own fee/payment
- Finish & save session, file delivery, add to calendar, no-show
- Moving their own session (the v20.12.34 engineer reschedule)

**Install:**
- Apply after the v20.12.43 engineer offers patch: the session page and Today page in this zip include those changes.
- Copy the files over your project and deploy. No SQL needed.

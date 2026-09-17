# v20.12.31 — Mix & Master wording + customer comms polish

Apply this on top of v20.12.30 by copying the files in this ZIP over the matching paths in your app.

## What changed
- New mix creation now defaults to **Mix & Master**.
- Service copy is consistently **Mix & Master** instead of “Mix + master”.
- Customer setup SMS now reads cleanly, e.g. `Silkcrayon — Mix & Master: “Test Again”. £100.00 due. Due 17 Sept. Pay: …`.
- Review SMS is shorter and avoids awkward wording like `Test Mix mix`.
- Setup email has been rebuilt with a cleaner, mobile-safe card layout and clearer hierarchy.
- Email headline now identifies the project as `“Track Name” — Mix & Master`.
- The service selector explains that Mix & Master is the normal/default service.
- Deposit / pay-later accepts **£0.00 received** as well as part payments.

## Database
No Supabase migration required.

## Verification
`npm run check:imports` passed.
Modified server-side JS files pass `node --check`.
The full local test suite could not complete in this environment because `node-ical` is not installed in the mounted dependency set; this is an environment/dependency availability issue, not a failure in this patch.

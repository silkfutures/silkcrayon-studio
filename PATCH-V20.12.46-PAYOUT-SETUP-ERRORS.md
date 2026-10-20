# v20.12.46 — Clearer payout setup errors

- "Set up payouts" now shows Stripe's actual reason when setup can't start, instead of always saying Connect isn't enabled.
- A failed attempt no longer stays stuck for 24 hours. A fresh try works once the problem is fixed (within about 10 minutes).

Install: copy the 2 files over your project and deploy. No SQL needed. Apply after v20.12.43.

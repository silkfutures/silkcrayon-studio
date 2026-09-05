# Silkcrayon Studio OS — V20.7.9

## Included
- Owner revenue card on Home moved to the bottom, after Recently completed, and reduced to a compact summary.
- Payment correction hotfix: marking a manual booking unpaid now preserves a non-null payment method marker (`manual_voided`) so schemas with a NOT NULL `payment_method` constraint do not reject the correction.
- Artist list bulk selection for owners: Select, Select all, Delete selected. Existing server safeguards remain in place, so real/financial booking history is protected and non-deletable records are reported instead of silently removed.
- Past/walk-in session logging improved. Owner can choose an existing artist, date, start time, actual hours, and optionally record money already received by Cash / Bank transfer / Card-banking app / Other.
- A paid manual past session creates a `studio_payments` ledger entry so monthly revenue/accounting includes it.
- Home quick action renamed to `Log past session` with a Cash / walk-in / catch-up hint.

## SQL
No new SQL migration required.

## Validation
- `npm run check:imports` — PASS
- `npm run test:contracts` — PASS

# Silkcrayon v20.12.18 — Editable remaining balance

This is a one-file hotfix for v20.12.17.

## Fix
The **Remaining balance** field in Add Session → Deposit / part paid was read-only. It is now editable.

You can enter either side of the payment:
- Session value £50 + Already received £35 → Remaining balance becomes £15.
- Session value £50 + Remaining balance £15 → Already received becomes £35.

## Apply
Replace this file in your existing app:

`components/ManualBookingForm.js`

No database migration is required for this hotfix.

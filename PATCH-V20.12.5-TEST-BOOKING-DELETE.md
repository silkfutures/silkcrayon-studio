# v20.12.5 — Test booking delete/refund-state fix

Apply on top of v20.12.4.

## Fixes
- Refund controls now only appear when an actual refundable balance remains.
- Fully refunded test bookings no longer show a £0.00 refund action.
- Test-booking hard delete now checks the actual remaining refundable balance, not only the stored payment status.
- A stale `paid`/`part_refunded` status can no longer trap a fully refunded £1-or-less test booking.
- If money really does remain refundable, deletion is still blocked and shows the exact remaining amount.

No database migration required.

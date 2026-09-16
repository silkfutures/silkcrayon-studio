# V20.12.26 — Zero-paid balance reminders + Dry Hire ID override

- Allows `partial_paid` / balance-later bookings with `amount_paid_pence = 0`.
- Skips creation of a zero-value `studio_payments` ledger row.
- Removes the automation filter that previously excluded zero-paid scheduled balances.
- Adds `bookings.dry_hire_id_required boolean not null default true`.
- Manual Dry Hire booking form can waive ID verification for an individual booking.
- ID request helper, day-before automation, confirmation/reminder copy, Today badge and Session view all respect the per-booking override.

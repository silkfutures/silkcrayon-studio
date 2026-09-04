# V20.7.6.1 — Accounting correction hotfix

- Removes invalid `bookings.paid_at` writes from manual paid/unpaid corrections.
- Booking revenue dashboard uses the existing booking `created_at` timestamp instead of a nonexistent `paid_at` field.
- Accounting booking rows use `created_at`; `studio_payments` continue to use their real `paid_at`.
- Mobile accounting ledger collapses into readable transaction cards so correction controls no longer overflow the viewport.
- No SQL migration is required for this hotfix.

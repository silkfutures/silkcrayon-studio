# Silkcrayon Studio OS V20.7.8 — payment cleanup

- Keeps completed/real payments in the main Recent payments list.
- Moves pending, expired and cancelled checkout attempts into a separate expandable cleanup section.
- Pending/abandoned entries are explicitly marked as not counted as revenue.
- Adds per-entry Delete for unpaid pending/expired/cancelled records only.
- Protects completed payments: anything with a paid timestamp or Stripe PaymentIntent cannot be deleted.
- Adds Clear abandoned, which removes expired/cancelled attempts and pending checkouts older than 24 hours.
- Replaces obviously generated placeholder customer names on pending rows with “Checkout attempt”.
- No database migration required.

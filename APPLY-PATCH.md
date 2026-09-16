# Silkcrayon V20.12.25 — mix payment status on creation

Apply this patch over the current app.

Replace these files:

- `components/MixJobForm.js`
- `app/api/admin/mixes/route.js`
- `lib/mixPayment.js`

No Supabase migration is required. It uses the existing `mix_jobs` payment fields.

## What changes

When creating a mix you can now choose:

1. **Payment due / not paid yet** — existing behaviour. Full quote stays outstanding.
2. **Paid already** — records the full quote as received immediately and creates the mix in `ready_to_start`.
3. **Deposit / part paid** — enter the amount already received. The mix remains `awaiting_payment` with only the balance outstanding.

For paid/deposit jobs you can also record the payment method and an optional reference.

The existing mix payment-request flow already charges only the outstanding amount, so a £50 mix with £35 received will request £15 later.

No customer email/SMS is sent merely by creating the mix.

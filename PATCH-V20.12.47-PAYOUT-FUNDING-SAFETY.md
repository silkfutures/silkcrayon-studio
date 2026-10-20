# v20.12.47 — Engineers are never paid twice

## What changes
- **Card bookings** (customer paid by card through Stripe): unchanged. The engineer's fee is paid automatically after "Finish & save session", funded from that booking's own card payment. If the card payment can't cover it (e.g. it was refunded), it is **held for you** instead of quietly coming out of your Stripe balance.
- **Cash, bank-transfer, prepaid-hours bookings and any extra time:** **never pay automatically.** They appear in **Menu → Engineer pay** (and on the session) as **Choose how to pay**, with:
  - **Pay via Stripe**: sends it from your Stripe balance. You're asked to confirm that you haven't already paid them another way.
  - **Mark as paid outside Stripe**: you paid them yourself (cash or Monzo). This records it as paid and **closes it for good**; Stripe can never send it after that.
  - **Cancel**: nothing is paid.
- **Double-payment guards:**
  - Before marking a payout paid by hand or cancelling it, Studio OS checks Stripe. If Stripe had already sent it, it records it as paid via Stripe and tells you not to pay again.
  - A payout with a transfer on record is never sent again.
- **Stripe balance on Engineer pay:** shows available now, on its way, how much you've approved to come from the balance, and whether you're short.
- **Low-balance email:** at most one a day, when your approved Stripe payouts are more than your available balance.
- **Engineers see:** "Paid by the studio" or "With the studio". They never see your internal notes.

## Install
1. Supabase → SQL editor: run `supabase/v20-12-47-payout-funding-safety.sql`. Any existing unpaid payouts from non-card bookings are moved to **Choose how to pay**.
2. Copy the files over your project and deploy (apply after v20.12.45/46).

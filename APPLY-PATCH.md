# Silkcrayon v20.12.30 — Final Mix Setup + Monzo Payment Links

Apply this patch over the current Silkcrayon app, replacing matching files.

## What this includes
- Mix setup / what-to-expect customer email
- Turnaround + included revision rounds on mix creation
- Delete test mixes safely from accounting
- Canonical `silkcrayon.com` customer/review links
- Existing multi-file delivery + approval/revision workflow compatibility
- **Monzo payment link as the default payment-request method**
- Stripe checkout retained as an optional fallback

## Monzo flow
For an unpaid or part-paid mix:
1. Choose **Monzo payment link** under Payment request.
2. Create the link in Monzo for the exact outstanding amount.
3. Paste the HTTPS link into the form.
4. Create the mix.
5. The customer gets the polished setup / what-to-expect email with **Pay £X** pointing to your Monzo link.
6. When the payment lands, mark the mix paid manually in Silkcrayon.

Stripe remains available if you want automatic payment detection.

## Database
No new Supabase migration is required for this patch.

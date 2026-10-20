# v20.12.48 — Invoice this quote

## Where
Projects & quotes → open a project → **Invoice this quote** (under the quote editor).

## Sending an invoice
- **Choose the amount:**
  - **Deposit** (default 50%; change the %)
  - **Full amount**
  - **Balance remaining** (once something's been paid)
  - **Custom amount**
- **Set a due date.** It defaults to today + your payment terms.
- **Press Email invoice.** The customer gets:
  - an **invoice PDF** (SC-I-…) with your bank details and reference
  - a **Pay by card** button. It opens a secure page that also shows the bank details, then Stripe checkout (Apple Pay / Google Pay where available).
- The panel shows **quote total / paid / invoiced but unpaid / left to invoice**.
- Sending a deposit moves the project to **Deposit due**. When the deposit is paid it moves to **Scheduled**.

## Getting paid
- **By card:** recorded automatically through your existing Stripe webhook. The customer gets a **receipt PDF**, you get an email, and it appears in Accounting.
- **By bank transfer or cash:** press **Mark as paid** → choose the method → confirm. The customer is emailed a receipt and it's recorded in Accounting.

## Never billed or paid twice
- **One unpaid invoice per project at a time.** You can't bill more than what's left on the quote.
- **Mark as paid checks Stripe first.** If the customer has already paid by card, it refuses and records the card payment instead. Any open card checkout is closed before a bank transfer is recorded.
- **Cancel invoice** closes it and kills its payment link. If a customer somehow pays a cancelled invoice, you're emailed to refund it.
- **Resend** sends a fresh link; the old link stops working.
- Opening the card page twice reuses the same checkout.

## Install
1. Supabase → SQL editor: run `supabase/v20-12-48-project-invoices.sql`.
2. Copy the files over your project and deploy. This patch includes the latest `settings/page.js` and Stripe webhook, so apply it after v20.12.47.
3. **Settings → Invoice payment details:** enter account name, sort code, account number and payment terms. Leave them blank to offer card only.

No new environment variables. Card payments use your existing Stripe key and webhook.

Not a VAT invoice — amounts are the quoted GBP totals, as with existing PDFs.

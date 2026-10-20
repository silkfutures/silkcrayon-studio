# v20.12.50 — New invoice layout

Every PDF (invoices, receipts, quotes, session statements) now uses a clean white layout like your Invoice 1118:
- your business details top left and the black SILKCRAYON logo top right
- INVOICE TO on the left, with INVOICE no. / DATE / TERMS / DUE DATE on the right
- a DATE / SERVICE / DESCRIPTION / QTY / RATE / AMOUNT table, with a dashed rule
- BALANCE DUE in bold, with payments received shown when there is a deposit
- "Please make payment to:" with your bank details and reference (from Settings → Invoice payment details), plus a Pay by card link
- Page X of Y in the footer

Booking invoices now show your bank details too, when an amount is still due.

PDFs you've already sent keep their numbers and amounts. If downloaded again, they appear in the new layout.

## Optional: match the header exactly
In Vercel → Environment Variables (then redeploy):
- `INVOICE_BUSINESS_NAME` = `Silkcrayon LTD`
- `INVOICE_BUSINESS_ADDRESS` = `113-116 Portland House, Cardiff, CF10 5EQ`. Commas become separate lines.
- `INVOICE_BUSINESS_PHONE` = your studio phone number (new, optional)
- `INVOICE_BUSINESS_DETAILS`: printed small and grey under your email (e.g. company number). Leave it empty to hide it.

## Install
Copy the 6 files over your project and deploy. No SQL needed. Apply after v20.12.48.

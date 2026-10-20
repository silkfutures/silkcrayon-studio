# v20.12.51 — Switch from QuickBooks

## What you get
- **QuickBooks archive:** Menu → QuickBooks archive, or Accounting → QuickBooks archive.
  - All 150 invoices (1001–1154) and 203 sales receipts, with line items, searchable by customer or number.
  - Set any old invoice to **Paid / Unpaid / Void** if you want to chase or tidy them. QuickBooks only recorded payment on a couple, so most start as "Payment not recorded".
  - Totals here are kept separate from Studio OS revenue.
- **Artists:** your 18 QuickBooks customers with an email become (or merge into) artists. Existing artists aren't overwritten; gaps are filled and a "QuickBooks customer" note is added. Nobody is subscribed to marketing. Each artist's profile shows their **QuickBooks history**.
- **Invoice numbering continues:** on the archive page, press **Start numbering from here** (it suggests **1155**).
  - New invoices and receipts are then numbered 1155, 1156… and their PDFs are named Invoice_1155.pdf.
  - A project invoice and its receipt share one number.
  - The OS refuses any number already used, here or in QuickBooks.
  - Quotes keep SC-Q numbers.

## Install, in this order
1. Supabase → SQL editor: run `supabase/v20-12-51-quickbooks-import.sql`.
2. Supabase → SQL editor: run **quickbooks-data-import.sql** (sent separately; it contains your customers' details). Then delete it, and don't put it in GitHub. It's safe to re-run: nothing duplicates.
3. Copy these files over your project and deploy. Apply after v20.12.50.
4. Open **QuickBooks archive** and press **Start numbering from here** (1155).

If you add anything in QuickBooks after the 20 Oct export, send a fresh export and it can be imported on top.

# v20.12.52 — Invoicing (replaces v20.12.51), faster opening, fixed QuickBooks import

## 1. Opening speed
- **The app now opens on Today**, the fast screen. Before, it opened on the Owner overview, which loaded your entire payment history and every website visit before showing anything.
- **The Owner overview** now shows instantly. Revenue, paid hours and visitors fill in a moment later.
- **If it's still slow,** sign in and open `https://silkcrayon.com/api/admin/speed`, then send the result. It times each step: sign-in, database and full payment history.

## 2. Invoicing (Menu → Invoicing)
- **New invoice:**
  - **Who to bill:** pick an artist, or tick "someone who isn't in my artists" for organisations, and type their name, email and address.
  - **Add past sessions:** shows that artist's unpaid bookings and logged walk-in sessions. Tap **Add** to put them on the invoice.
  - **Add your own lines:** date, service, description, qty/hours, rate.
  - **Finish:** set a due date and optional title/notes (e.g. a PO number), then **Save draft** or **Save & email invoice**.
- **The customer gets:**
  - a PDF in your Invoice 1118 layout
  - your bank details
  - a **Pay by card** link
- **Invoice list:** what's owed, what's overdue, and paid this month. Project invoices appear here too.
- **Each invoice:** Download PDF, Resend, **Mark as paid** (bank transfer / cash / other) or **Cancel invoice**.
- **Numbering:** "Start numbering from here" (1155) is at the bottom of the Invoicing page.
- **Past invoices (QuickBooks):** your QuickBooks history, as a tab on the same page.
- **Shortcut:** each artist's profile has a **New invoice** button.

## 3. Accounting
When an invoice is paid (card, bank transfer or cash), it's recorded once in Accounting and on the overview:
- **Past bookings** on it are marked paid at the invoiced price (on the day it's paid).
- **Logged walk-in sessions** become session payments, so paid hours stay right.
- **Your own lines** become one payment.

Nothing counts until it's paid.

## 4. Never billed or paid twice
- A session can only be on one invoice at a time. Cancelling or deleting an invoice frees its sessions.
- Mark as paid checks Stripe first: if the customer already paid by card, it records the card payment instead.
- Duplicate Stripe notifications are ignored.

## Install
1. Supabase → SQL editor, in order:
   - `supabase/v20-12-51-quickbooks-import.sql` (skip it if you already ran it)
   - `supabase/v20-12-52-invoicing.sql`
   - **quickbooks-data-import.sql** (sent separately). Paste the whole file, press Run, and check the summary table at the end: 150 invoices, 203 sales receipts. Then delete the file.
2. Copy these files over your project and deploy. Apply after v20.12.50. This replaces v20.12.51.
3. Invoicing → **Start numbering from here** (1155).

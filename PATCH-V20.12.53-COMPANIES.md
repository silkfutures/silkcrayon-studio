# v20.12.53 — Companies

Save the organisations you invoice regularly, with their billing address, and pick them on an invoice.

- **Invoicing → Companies:**
  - **Add a company:** company name, contact person (printed "FAO …"), invoice email, phone, billing address and private notes.
  - **Company page:** shows its details (editable), what it owes, every invoice you've sent it, and its old QuickBooks invoices. **+ New invoice** starts an invoice for that company with everything filled in.
- **New invoice → Bill to:**
  - **An artist:** as before.
  - **A company:** choose a saved company (or **+ Add a new company** right there). Its name, email and address fill in. If the company is paying for an artist's sessions (e.g. Silkfutures paying for a young artist), choose the artist too and add their unpaid sessions; they're marked paid when the company pays.
  - **Someone else (one-off):** type the details. Tick **Save as a company for next time** to keep them.
- **Imported from QuickBooks:** your 10 QuickBooks customers with a billing address are added as companies, including ACT Training, Lucent Dreaming Ltd, National Theatre Wales, Wales Millennium Centre (Lily Webbe) and Action For Children (Toni). Remove any you don't need from their company page.
- Companies are kept separate from artists, so they never get booking reminders or marketing.
- Also fixed: on phones, the invoice editor no longer runs off the side of the screen.

## Install
1. Supabase → SQL editor: run `supabase/v20-12-53-companies.sql`. Run it after the QuickBooks data import, so the companies get copied in. It's safe to run again later.
2. Copy these files over your project and deploy. Apply after v20.12.52.

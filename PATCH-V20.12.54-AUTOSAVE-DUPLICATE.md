# v20.12.54 — Invoice autosave + duplicate

## Never lose an invoice
- While you type, the invoice is saved on the device you're using.
- If you click away or close the tab, you're warned first. Next time you open **New invoice** (or that draft), it asks **"Restore unsaved invoice?"** → **Restore it** or **Discard**.
- Kept for 30 days, on that device only. Press **Save draft** to keep it on your account for every device.

## Duplicate
- **Duplicate** on any sent or paid invoice (on the invoice page and in the invoice list) makes a new draft dated today. It has the same customer or company, lines, prices, title and notes. Adjust it, then **Save & email**.
- **Duplicate as new** on any past QuickBooks invoice (Invoicing → Past invoices) does the same for your old regulars. It picks up the saved company or artist details automatically.
- Copies never re-bill a session: lines become normal lines, and the original sessions stay on the original invoice. A copy only gets its invoice number when you send it.

## Install
Copy these files over your project and deploy. No SQL needed. Apply after v20.12.53.

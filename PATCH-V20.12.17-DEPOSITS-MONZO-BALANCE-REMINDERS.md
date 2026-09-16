# V20.12.17 — deposits / part payments + Monzo balance reminders

## What changed
- Manual **Add Session** now has a **Deposit / part paid** payment option.
- Record how much has already been received and how it was paid.
- Pick the date Silkcrayon should remind the customer about the remaining balance.
- Paste an external payment URL — designed for a **Monzo Business payment link** for the remaining amount.
- The booking stores the amount already paid and shows the true remaining balance in the session/payment UI.
- A daily automation sends the customer the scheduled balance reminder by email and SMS.
- When you later press **Mark as paid**, Studio OS records only the remaining balance as the final payment and closes the reminder.

## Monzo workflow
Example: £50 session, £35 already paid.
1. Add the session and choose **Deposit / part paid**.
2. Enter **£35** received.
3. In Monzo Business create a new **£15 payment link**.
4. Paste that £15 link into **Monzo balance payment link**.
5. Pick the reminder date.
6. On that date Studio OS sends the customer the £15 link automatically.
7. Once the £15 arrives in Monzo, open the booking and press **Mark as paid**.

Monzo's public Developer API does not currently expose creation of Business Get Paid payment links, so creating the exact remaining-balance link in Monzo remains a manual step. The sending/reminder is automated here.

## Required database step
Run:

`supabase/v20-12-17-part-payments-monzo-reminders.sql`

No new environment variable is required. If a balance link is omitted, the reminder asks the customer to use the bank details already supplied or contact the studio.

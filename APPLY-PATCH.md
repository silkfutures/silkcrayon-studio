# Silkcrayon Studio OS — v20.12.26

This patch is designed to be applied on top of the current v20.12.25 chain.

## What it changes

1. **£0 paid + balance later**
   - `Deposit / pay later` now accepts **£0.00 already received**.
   - You can attach the Monzo balance link and choose the reminder date even when nothing has been paid yet.
   - The scheduled balance reminder automation now includes £0-paid bookings.
   - No £0 payment ledger entry is created.

2. **Dry Hire — optional ID check per booking**
   - Dry Hire creation now has **Require ID check for this booking** (on by default).
   - Turn it off for a known/approved artist when you do not need an ID upload for that booking.
   - When off, Studio OS does not send the ID request or the day-before ID reminder.
   - Customer confirmation/reminder and admin session views show that ID is not required for that booking.
   - Existing globally verified Dry Hire customers continue to bypass a new upload automatically.

## Apply

Copy the files in this patch over the matching paths in the app.

Then run this Supabase migration **once**:

`supabase/v20-12-26-zero-balance-later-dry-hire-id-override.sql`

Then redeploy.

## Important

The Dry Hire ID override is **per booking**. It does not falsely mark the customer as permanently ID verified.

The balance reminder is still **date-based**. This patch allows £0 received and a scheduled reminder; it does not add an exact reminder time-of-day.

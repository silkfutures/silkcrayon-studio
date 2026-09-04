# Silkcrayon Studio OS V20.7.5

## Extra session time / external payments
- Session reports now detect when actual hours exceed booked hours.
- Owners can record the extra time as already paid while completing the report.
- Supported methods: bank transfer, cash, card/banking app, other.
- The payment is stored as a separate paid `studio_payments` ledger entry linked to the booking and report.
- View Session also has an Additional payments control, so an external payment can be logged after the report has already been submitted.
- View Session shows booked vs actual time when the session ran over.
- Monthly Studio OS revenue and paid-hours totals now include paid `studio_payments`, including extra studio time.
- Analytics monthly revenue and paid hours use the same complete revenue model.

## Recently completed
- Recently completed sessions on the engineer/home dashboard are now expandable.
- Expanded rows expose Call, Text and View session actions plus the customer phone number and work summary.

## Database
Run `supabase/v20-7-5-extra-session-payments.sql` after V20.7.4.
It adds payment method/category, report linkage and paid session-hours fields to `studio_payments`.

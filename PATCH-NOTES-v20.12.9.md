# Silkcrayon OS v20.12.9 — incremental patch

Apply this patch on top of the assembled v20.12.8.2 project.

## Install

1. Overlay the ZIP contents at the project root.
2. Run supabase/v20-12-9-customer-picker-multitrack-mix.sql once in Supabase.
3. Redeploy.

## Included

- Shared customer search by artist name, full name, email or phone, with inline customer creation.
- Multi-track mix projects with an overall quote and ordered track records.
- Separate Save internally and Send payment request actions.
- Stripe checkout for the outstanding balance, transactional email and consent-aware SMS.
- Payment gate and automatic activation after Stripe confirms full payment.
- Clear quoted, paid and outstanding amounts without duplicating mix revenue.
- Mix activity and communication history, client multi-track portal, revisions and existing secure delivery.
- Artist-development hero correction: the unintended Nathan portrait is removed from the top; adviser portraits remain in their relevant section.

## Verification

- Import check passed.
- Contract tests passed.
- Next.js production build passed.

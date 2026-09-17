# Silkcrayon v20.12.32 — mix redirect + automation logging

Apply this patch over v20.12.31.

Replace these files:
- `components/MixDeliveryPanel.js`
- `components/MixDeliveryPanel.module.css`
- `app/api/admin/mixes/[id]/delivery/route.js`
- `app/api/admin/mixes/route.js`
- `app/api/mix-review/[token]/route.js`
- `app/admin/automation/page.js`

No Supabase migration is required.

## Behaviour
- After a successful mix delivery, the admin is returned to `/admin/mixes`.
- Mix setup/payment emails and SMS messages now write to `notification_log`.
- Mix review-ready emails and SMS messages now write to `notification_log`.
- Owner emails for mix approval / revision requests also write to `notification_log`.
- Automation > Recent messages shows readable labels for these events.

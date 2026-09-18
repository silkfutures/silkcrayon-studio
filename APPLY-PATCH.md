# Silkcrayon PATCH v20.12.35 — Studio Finish flexible pricing

Apply this patch on top of v20.12.34.

## What changed
- Removed the public £60 fixed-price claim from the FAQ.
- FAQ now explains that Studio Finish is scoped to the actual track; small jobs may be around £25–£30 while larger jobs cost more.
- Terms now state that scope, price, turnaround and included revisions are agreed before work starts.
- Post-session follow-up email no longer advertises Studio Finish at a fixed £60.
- Customer Studio Finish page no longer offers a fixed-price checkout; it now routes the customer to request a quote.
- Internal Studio OS quoting remains flexible and can still use your configured Studio Finish price as a starting/default quote.

## Files
- `app/faq/page.js`
- `app/terms/page.js`
- `app/account/mix-master/page.js`
- `notifications.js`

No Supabase migration required.

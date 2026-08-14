# Silkcrayon Studio OS — V17

## Commercial workflow
- Flexible 1–20 hour studio-hours selector instead of fixed 5/10 buttons.
- Automatic bulk pricing: 1–4 £60/hr, 5–7 £55/hr, 8–9 £52.50/hr, 10+ £50/hr.
- Additional recorded staff discounts: none, 5% loyalty, 10% approved.
- Pay uses artist typeahead search rather than a large dropdown.
- Mix & Master product added at £120 by default, configurable by environment variable.
- Mix & Master payment confirmation email explains turnaround, revisions and process.
- Customer portal can self-purchase Mix & Master at `/account/mix-master`.
- Post-session follow-up now includes a Mix & Master CTA.

## Session workflow
- Removed Engineer Fee from the visible session-report workflow. Backend legacy column remains at 0 for compatibility.
- Replaced vague Follow-up field with structured Project Status.
- Files field is now a lightweight Deliverables / files note rather than pretending Silkcrayon OS is file storage.
- Session page has a dedicated Next Move upsell panel for flexible hours and Mix & Master.
- Added back navigation to session reports and Pay.

## Setup
1. Run `supabase/v17-commercial-workflow.sql`.
2. Optional Vercel variables: `MIX_MASTER_PRICE_PENCE`, `MIX_MASTER_TURNAROUND`, `MIX_MASTER_REVISIONS`. Defaults are £120, 5–7 working days, 2 revisions.

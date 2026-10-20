# v20.12.42 — Engineer session offers + automatic engineer payouts

## What it does
**Adjust the deal before you send it (v20.12.43)**
- **What you're offering:**
  - **Their usual rate:** from their staff profile.
  - **Custom hourly rate:** e.g. £17.50/h for a full day = £140. Approved extra time is paid at £17.50 too.
  - **Fixed fee for the job:** paid exactly that amount, however long the session runs.
- **Who should get it:**
  - **One at a time:** backups in order.
  - **Everyone at once:** all ticked engineers get it with the same deadline. The first to accept takes it and everyone else's offer closes ("another engineer accepted it first"). If two press Accept at the same moment, the database lets only one win.
- **Dry hire, open & close:** dry hires can be offered too, as a flat **£20** fee by default (change it in Settings, or on each offer). The email and page say "open & close only, no engineering". The opener confirms with Finish & save session and gets the flat fee automatically. Hours never change a fixed fee.

**Session offers**
- On a booking (Session view → **Engineer**), tick the engineer you want, then any backups, in order. Each line shows that engineer's fee for this session.
- The first choice gets an email (and a text if Twilio is set up and they have a phone number) showing the session, the artist, **their fee** and **Accept / Decline** buttons. They can also answer from **Today** in Studio OS.
- Response window: **12 hours by default**, **2 hours when the session is within 48 hours**. Offers always close **2 hours before the session**. You can change all of this in **Settings → Session offers & engineer pay**, or pick a different window when you send an offer.
- If they decline or the window runs out, the next backup gets it automatically. Once an offer expires, its link stops working.
- If nobody accepts, you get an **Unfilled session** email.
- **Artist's choice:** if the artist picked a specific engineer (or has a supported-artist agreement), backups are **not** offered until you press **Approve & offer [name]**. You get an email when that happens.
- Status shows on the overview and the session: **Awaiting response → Accepted**, with the deadline and the full offer history (sent, declined + reason, expired, accepted).
- If two people press Accept at the same moment, only the first one gets the session (the database decides). Engineers who already have a session at that time can't be offered it.
- The old "Assign engineer" dropdown still works for assigning someone directly. It cancels any open offers.

**Automatic payouts (Stripe Connect)**
- Each engineer has a pay rate (£/hour) on their staff profile, kept **separate from customer pricing**. You can also set a different rate for supported-artist sessions.
- When an engineer accepts, their fee is saved against the booking (e.g. Billy £20/h × 3h = **£60**). It stays the same even if the customer paid a supported or discounted rate, or you change the rate later.
- After the session the engineer presses **Finish & save session**. That confirms the hours and adds a new question: **"Anything to flag?"**.
- A routine session (hours match, nothing flagged) is **paid automatically** once the booked end time has passed. The engineer gets a "You've been paid" email.
- These wait for you in **Menu → Engineer pay**:
  - a flagged issue
  - fewer hours than booked
  - extra time (the booked fee still pays automatically; only the extra time waits)
  - no pay rate set
  - a failed transfer
- **No duplicate payments:**
  - Each payout is claimed before it's sent, so it can only go out once.
  - Each session can only have one payout of each type.
  - Before any retry, Studio OS checks Stripe for a transfer that has already gone through.
- Card bookings pay the engineer's transfer from that booking's own payment. Cash, bank-transfer and prepaid-hours bookings are paid from your **Stripe balance**. If the balance is too low, the payout retries automatically (15 min → 1 h → 4 h → 12 h → 24 h) and you get one email about it.
- "Released" is not the same as "in their bank". Money reaches their bank on their Stripe payout schedule. Instant Payouts (usually within about 30 minutes, fees apply, eligible accounts only) can be used from their Stripe dashboard.
- You (owner role) are never paid by the system.

## Setup — do these in order
1. **Supabase → SQL editor:** run `supabase/v20-12-42-engineer-offers-payouts.sql`, **then** `supabase/v20-12-43-offer-fees-dry-hire-access.sql`, **before** deploying.
2. **Stripe → Connect:** turn on Connect for your Stripe account (Dashboard → Connect → Get started). Use **Express** accounts, platform country **United Kingdom**.
3. **Stripe → Developers → Webhooks (recommended):** add an endpoint for **Events on connected accounts**:
   - URL: `https://silkcrayon.com/api/stripe/webhook`
   - Event: `account.updated`
   - Put its signing secret in Vercel as `STRIPE_CONNECT_WEBHOOK_SECRET`.

   Without this, payout setup still finishes: the engineer's earnings page re-checks Stripe when they come back from it.
4. **Deploy.** `vercel.json` adds a 5-minute cron, `/api/cron/engineer-work`. It uses your existing `CRON_SECRET`.
5. **Staff → each engineer → Engineer pay:** set their £/hour (and supported-artist rate if it's different).
6. **Each engineer:** Menu → **My earnings → Set up payouts**. This is a one-time Stripe form, about 5 minutes. Silkcrayon never sees their bank details. Any payments due before they finish wait as "Waiting for payout setup" and go out automatically once setup is done.
7. Optional: **Settings → Session offers & engineer pay** to change the response windows or turn automatic payouts off. When off, every payout waits for your approval.

## Test it end to end (Stripe test mode first)
1. Set Billy to £20/h.
2. Offer a 3-hour booking to Billy, with Benny as a backup.
3. Decline as Billy → Benny should get the offer email.
4. Accept as Benny.
5. After the session time, complete the report → in Engineer pay the payout shows **Scheduled**, then **Paid** within 5 minutes of the end time.

## Files
- New:
  - `lib/engineerOffers.js`, `lib/engineerPayouts.js`, `lib/engineerWorkRules.js`, `lib/engineerWorkEmails.js`
  - `app/engineer-offer/[token]` (the public Accept/Decline page)
  - `app/admin/engineer-pay` and `app/admin/engineer/payouts`
  - API routes under `api/admin/bookings/[id]/offers`, `api/engineer-offers`, `api/engineer/offers`, `api/engineer/payouts`, `api/admin/engineer-payouts`, `api/admin/staff/[id]/engineer-pay`, `api/admin/settings/engineer-work`, `api/cron/engineer-work`
  - Components: `EngineerOfferPanel`, `EngineerOfferResponse`, `EngineerPayoutActions`, `EngineerPaySettings`, `EngineerWorkSettingsForm`, `PayoutSetupButton`
  - Test: `tests/engineer-work.mjs`
- Changed:
  - Booking PATCH and lifecycle routes (direct assignment, cancellation/no-show close offers)
  - Session report API + form (payouts and "Anything to flag?")
  - Stripe webhook (`account.updated`)
  - Day-before cron (no auto-assign while an offer is out)
  - Session, Today, overview, More, Staff, Settings pages
  - `vercel.json`, `package.json`

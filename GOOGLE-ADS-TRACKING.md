# Google Ads purchase tracking

The purchase destination is `AW-18437935262/WGT2CISrovEcEJ6h8tdE`, set in `lib/googleAds.js`. No conversion-label environment variable is needed. The base tag uses the same account.

## What is counted

The shared return-page tracker asks the server to retrieve the Checkout Session directly from Stripe. It requires a completed, paid, live-mode GBP payment with a positive integer amount and a Stripe PaymentIntent ID. It also checks the matching booking, studio payment or mix record has been paid and has the same Checkout Session and PaymentIntent IDs. Values come from Stripe's `amount_total / 100`, including actual checkout discounts, and currency is GBP. Test-mode, unpaid, cancelled, unverified and zero-value sessions do not report purchases.

Booking, studio hours, gift, relaunch, Studio Finish and mix payment return URLs include the Checkout Session ID. Magic-link redirects preserve it. The client retries confirmation for approximately one minute to allow webhook fulfillment; a later refresh retries again. The webhook accepts both `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## Consent and duplicates

The existing advertising-cookie consent must be granted. Consent is checked again after verification and immediately before sending. No conversion is marked sent when the tag function is unavailable or throws. Cancellation prevents stale requests firing after navigation.

The Stripe PaymentIntent ID is the `transaction_id`. An in-memory guard, persistent browser markers and Web Locks (where available) suppress repeat sends and concurrent tabs. Google Ads uses the same transaction ID to deduplicate repeat reports for this conversion action, including across browsers or cleared storage. Browser tracking cannot guarantee delivery if the visitor closes the page, declines consent or blocks Google; a queued tag call is not a delivery receipt.

Do not also configure a URL/page-load purchase conversion or import the same purchase as another primary conversion action. Google transaction deduplication applies within the conversion action.

## Apply and verify

Overlay the patch files onto the existing project root, preserving their paths, then deploy using the normal deployment process. No database migration or new secret is required. In the existing Stripe webhook configuration, ensure `checkout.session.async_payment_succeeded` is subscribed alongside `checkout.session.completed` and `checkout.session.expired`.

Run `npm test` and `npm run build`. On the deployed site, verify an authorized live GBP payment with Google Tag Assistant: accept advertising cookies and check the destination, paid value and `pi_...` transaction ID. Refresh and open the return URL in another tab to confirm no extra report. Declined consent, arbitrary session IDs and Stripe test payments must send nothing. No live payment was made while developing this patch.

References:
- Stripe fulfillment: https://docs.stripe.com/checkout/fulfillment
- Google Ads transaction deduplication: https://support.google.com/google-ads/answer/6386790

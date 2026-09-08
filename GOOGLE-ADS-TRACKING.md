# Google Ads purchase tracking

The base tag uses `AW-18437935262`. It starts with Google Consent Mode v2 denied and the visitor must explicitly accept advertising cookies before conversion data is sent.

## One Google Ads value still needed

Create a **Website** conversion action for a **Purchase** in Google Ads and send the conversion's event snippet or its conversion label. It looks like `AW-18437935262/AbCdEf...`; only the part after the slash belongs in `NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL`.

Set the deployment variables:

```text
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-18437935262
NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL=AbCdEf...
```

Do not use a page-load conversion action for `/booking/success` in the Google Ads UI. The app sends the purchase event only after Stripe says the session is paid and the booking record is marked paid and confirmed.

## Test

1. Deploy with Stripe test keys and a test webhook endpoint.
2. Make a successful test booking, accept advertising cookies on the confirmation page, and inspect the browser network / Google Tag Assistant for a `conversion` event with GBP value and a booking `transaction_id`.
3. Refresh the confirmation page. No second event should be sent (browser storage plus Google transaction-ID deduplication).
4. Visit the confirmation URL for a cancelled, unpaid, or arbitrary Stripe session. The conversion verification endpoint returns no eligible conversion and sends nothing.
5. In production, place one low-value real test purchase and confirm it appears in Google Ads diagnostics; Google Ads reporting can take several hours.

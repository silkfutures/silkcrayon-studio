# Purchase tracking patch

Apply to the project from silkcrayon-studio-main (5).zip.

1. Copy the app/, components/, lib/, tests/, package.json and GOOGLE-ADS-TRACKING.md files from this patch into your existing project root, replacing matching files.
2. Deploy normally. No database changes or new dependencies are required.
3. Ensure the Stripe webhook subscribes to checkout.session.async_payment_succeeded as well as the existing checkout.session.completed event.
4. Follow GOOGLE-ADS-TRACKING.md for the live Google Tag Assistant check.

Configured destination: AW-18437935262/WGT2CISrovEcEJ6h8tdE.
Verified live Stripe GBP payment values, unique PaymentIntent transaction IDs, consent gating and duplicate protection are included across purchase flows.

Validation: all six test suites, import checks and Next.js production build passed. Build used fallback settings because production Supabase credentials were not supplied. No deployment, live Stripe payment or Google Ads account verification was performed.

Changed files:
- GOOGLE-ADS-TRACKING.md
- app/account/access/route.js
- app/api/admin/mixes/[id]/route.js
- app/api/admin/payments/route.js
- app/api/customer/mix-master/route.js
- app/api/customer/mixes/[id]/pay/route.js
- app/api/customer/packages/route.js
- app/api/google-ads/purchase/route.js
- app/api/store/checkout/route.js
- app/api/stripe/webhook/route.js
- app/booking/success/page.js
- app/layout.js
- components/GoogleAdsPurchaseConversion.js
- lib/googleAds.js
- lib/reportGoogleAdsPurchase.js
- package.json
- tests/google-ads.mjs

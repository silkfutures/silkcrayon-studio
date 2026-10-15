# 5% signup bot protection

Apply this patch over your latest project files.

## Required setup before deployment
1. In Cloudflare, open Turnstile and add a Managed widget for `silkcrayon.com` and `www.silkcrayon.com`.
2. In the Vercel project environment variables, add:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — the widget's public site key.
   - `TURNSTILE_SECRET_KEY` — its private secret key (never use a NEXT_PUBLIC prefix).
3. Set these for Production. For preview testing use a separate widget restricted to your preview hostname, and set NEXT_PUBLIC_SITE_URL to that URL.
4. Merge this patch and redeploy. A rebuild is required for the public site key.
5. Test a signup you control, then check Automations for the reward email.

No SQL update is required by this patch. Existing form-security/rate-limiter and message-activity migrations must already be applied.

The signup rejects requests when the CAPTCHA is missing, invalid, replayed, from another hostname/action, or verification is unavailable. Missing keys disable signup rather than bypass protection. Existing signed form tokens, replay protection, honeypot and rate limits stay in place. New daily limits allow five signups per IP and one per email address. Used signup rewards are not re-enabled by this form.

This applies to the standalone 5% email signup endpoint. Booking checkout retains its existing form security. It does not remove existing contacts, retract sent emails or prove ownership of an entered email address. Turnstile reduces automated abuse; double opt-in would be a separate email-ownership check.

Validation: production build, existing tests, and tests/signup-bot.mjs passed. Live CAPTCHA verification requires your own configured keys; no real signup email was sent during development.

Cloudflare setup documentation: https://developers.cloudflare.com/turnstile/get-started/

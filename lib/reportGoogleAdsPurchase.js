import {GOOGLE_ADS_PURCHASE_DESTINATION} from "./googleAds.js";
const sent = new Set();
function stored(storage, key) { try { return storage?.getItem(key); } catch { return null; } }
function remember(storage, key) { try { storage?.setItem(key, "1"); } catch {} }
export async function reportPurchase(purchase, {win = window, hasConsent, isCancelled = () => false}) {
  if (!purchase?.transaction_id?.startsWith("pi_") || purchase.currency !== "GBP" ||
      !Number.isFinite(purchase.value) || purchase.value <= 0) return false;
  const key = `sc_google_ads_purchase:${GOOGLE_ADS_PURCHASE_DESTINATION}:${purchase.transaction_id}`;
  let local, session;
  try { local = win.localStorage; } catch {}
  try { session = win.sessionStorage; } catch {}
  const send = () => {
    if (isCancelled() || !hasConsent() || typeof win.gtag !== "function") return false;
    if (sent.has(key) || stored(local, key) || stored(session, key)) return true;
    // Synchronous guard prevents concurrent components sending the same payment.
    sent.add(key);
    try {
      win.gtag("event", "conversion", {send_to: GOOGLE_ADS_PURCHASE_DESTINATION, ...purchase});
    } catch { sent.delete(key); return false; }
    remember(local, key);
    remember(session, key);
    return true;
  };
  // Cross-tab serialization where supported; Google also deduplicates by payment ID.
  return win.navigator?.locks ? win.navigator.locks.request(key, send) : send();
}

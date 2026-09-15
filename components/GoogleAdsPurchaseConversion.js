"use client";
import {useEffect, useState} from "react";
import {useSearchParams} from "next/navigation";
import {reportPurchase} from "../lib/reportGoogleAdsPurchase";
function hasAdsConsent() { return document.cookie.split(";").some(x => x.trim() === "sc_google_ads_consent=granted"); }
export default function GoogleAdsPurchaseConversion() {
  const sessionId = useSearchParams().get("session_id");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const changed = () => setVersion(v => v + 1);
    window.addEventListener("sc-google-consent-updated", changed);
    return () => window.removeEventListener("sc-google-consent-updated", changed);
  }, []);
  useEffect(() => {
    if (!sessionId || !hasAdsConsent()) return;
    let cancelled = false, timer;
    const controller = new AbortController();
    async function attempt(number = 0) {
      if (cancelled || !hasAdsConsent()) return;
      try {
        const response = await fetch(`/api/google-ads/purchase?session_id=${encodeURIComponent(sessionId)}`, {cache: "no-store", signal: controller.signal});
        if (response.ok && await reportPurchase(await response.json(), {hasConsent: hasAdsConsent, isCancelled: () => cancelled})) return;
        if (response.status === 400) return;
      } catch { /* Retry transient failures while Stripe's webhook completes. */ }
      if (!cancelled && number < 30) timer = setTimeout(() => attempt(number + 1), 2000);
    }
    attempt();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [sessionId, version]);
  return null;
}

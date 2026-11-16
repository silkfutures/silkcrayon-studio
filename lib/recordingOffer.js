// Shared by the public booking UI and server checkout. Keep other services untouched.
export const RECORDING_OFFER_END = "2026-12-01T00:00:00Z";
export const RECORDING_OFFER_HOURLY_PENCE = 4000;
export function recordingOfferActive(now = Date.now()) {
  return now < Date.parse(RECORDING_OFFER_END);
}
export function recordingOfferEligible(slug, duration, now = Date.now()) {
  return slug === "vocal-recording" && Number(duration) >= 120 && recordingOfferActive(now);
}
export function recordingOfferPrice(duration) {
  return Math.round(Number(duration) / 60 * RECORDING_OFFER_HOURLY_PENCE);
}

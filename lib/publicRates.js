import { SERVICES, formatGBP } from './services.js';
import { recordingOfferActive, RECORDING_OFFER_HOURLY_PENCE } from './recordingOffer.js';

export function recordingRateLabel(standardPence, now = Date.now()) {
  const standard = formatGBP(standardPence);
  return recordingOfferActive(now)
    ? `${standard} for 1 hour · ${formatGBP(RECORDING_OFFER_HOURLY_PENCE)}/hour for 2+ hours`
    : `${standard}/hour`;
}

export const dryHireRate = formatGBP(SERVICES['dry-hire'].hourlyPence);
export const voiceoverRate = formatGBP(SERVICES.voiceover.hourlyPence);

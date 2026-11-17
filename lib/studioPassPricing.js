import {recordingOfferActive,RECORDING_OFFER_HOURLY_PENCE} from './recordingOffer.js';
export const STUDIO_PASS_HOURLY_PENCE=3500;
export function studioPassPrice(hours){
 if(!Number.isInteger(Number(hours))||Number(hours)<4||Number(hours)>8)throw new Error('Choose between 4 and 8 pass hours.');
 return Number(hours)*STUDIO_PASS_HOURLY_PENCE;
}
export function studioPassComparisonPrice(hours,standardHourlyPence=5000,now=Date.now()){
 return Number(hours)*(recordingOfferActive(now)?RECORDING_OFFER_HOURLY_PENCE:standardHourlyPence);
}

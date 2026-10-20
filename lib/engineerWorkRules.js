// Pure rules for engineer session offers and payouts.
// No database, Stripe or Next.js imports here so the rules can be unit tested directly.
import {londonDateTimeToUtc} from './time.js';

export const OFFER_DEFAULTS={windowHours:12,urgentWindowHours:2,urgentThresholdHours:48,cutoffHours:2,autoPayouts:true,dryHireAccessFeePence:2000};
export const MIN_OFFER_MINUTES=15;
export const PAYOUT_MAX_ATTEMPTS=6;
const RETRY_MINUTES=[15,60,240,720,1440];
const HOUR=3600000;

const clamp=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};

export function normaliseOfferSettings(map={}){
 return {
  windowHours:clamp(map.engineer_offer_window_hours,0.5,168,OFFER_DEFAULTS.windowHours),
  urgentWindowHours:clamp(map.engineer_offer_urgent_window_hours,0.25,48,OFFER_DEFAULTS.urgentWindowHours),
  urgentThresholdHours:clamp(map.engineer_offer_urgent_threshold_hours,0,336,OFFER_DEFAULTS.urgentThresholdHours),
  cutoffHours:clamp(map.engineer_offer_cutoff_hours,0,72,OFFER_DEFAULTS.cutoffHours),
  autoPayouts:map.engineer_auto_payouts===undefined?OFFER_DEFAULTS.autoPayouts:String(map.engineer_auto_payouts)!=='false',
  dryHireAccessFeePence:Math.round(clamp(map.engineer_dry_hire_access_fee_pence,0,100000,OFFER_DEFAULTS.dryHireAccessFeePence))
 };
}

function hhmm(t){return String(t||'').slice(0,5);}
function nextDay(date){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}

export function sessionStartUtc(booking){return londonDateTimeToUtc(String(booking?.booking_date||''),hhmm(booking?.start_time));}
export function sessionEndUtc(booking){
 const start=hhmm(booking?.start_time),end=hhmm(booking?.end_time);
 if(!end)return null;
 // Overnight sessions finish on the following calendar day.
 const date=end<=start?nextDay(booking.booking_date):booking.booking_date;
 return londonDateTimeToUtc(String(date||''),end);
}

/**
 * When must the engineer respond by?
 * - default window (12h) or the urgent window (2h) when the session starts soon
 * - never later than `cutoffHours` before the session starts
 * - an owner override replaces the default/urgent window
 */
export function offerDeadline({now=new Date(),sessionStart,settings=OFFER_DEFAULTS,overrideHours=null}){
 const start=sessionStart instanceof Date?sessionStart:new Date(sessionStart);
 if(!start||Number.isNaN(start.getTime()))return {ok:false,reason:'invalid_session_time'};
 const hoursToStart=(start.getTime()-now.getTime())/HOUR;
 if(hoursToStart<=0)return {ok:false,reason:'session_started'};
 const urgent=hoursToStart<=settings.urgentThresholdHours;
 const window=Number(overrideHours)>0?Number(overrideHours):urgent?settings.urgentWindowHours:settings.windowHours;
 const latest=start.getTime()-settings.cutoffHours*HOUR;
 const expires=Math.min(now.getTime()+window*HOUR,latest);
 if(expires-now.getTime()<MIN_OFFER_MINUTES*60000)return {ok:false,reason:'too_late',hoursToStart};
 return {ok:true,expiresAt:new Date(expires),urgent,windowHours:window,cappedByCutoff:expires===latest};
}

/** Engineer pay is separate from what the customer pays. Supported-artist sessions can use their own rate. */
export function engineerRateFor(engineer,booking){
 if(!engineer)return null;
 const supported=booking?.supported_artist_id&&engineer.engineer_supported_pay_hourly_pence!=null;
 const rate=supported?engineer.engineer_supported_pay_hourly_pence:engineer.engineer_pay_hourly_pence;
 return rate==null?null:Math.max(0,Math.round(Number(rate)));
}
/**
 * What the engineer is offered for this booking.
 * - owner-typed fixed amount → flat job fee
 * - owner-typed hourly rate (e.g. £17.50/h for a full day) → that rate × booked hours
 * - dry hire → flat "open & close" fee (no engineering)
 * - otherwise → their usual hourly rate × booked hours
 */
export function offerTerms({engineer,booking,customFeePence=null,customHourlyPence=null,settings=OFFER_DEFAULTS}){
 if(customHourlyPence!=null){const rate=Math.round(Number(customHourlyPence));return {pay_hourly_pence:rate,fee_pence:feeFor(rate,booking?.duration_minutes),fee_is_flat:false};}
 if(customFeePence!=null)return {pay_hourly_pence:null,fee_pence:Math.round(Number(customFeePence)),fee_is_flat:true};
 if(booking?.service_slug==='dry-hire')return {pay_hourly_pence:null,fee_pence:settings.dryHireAccessFeePence??OFFER_DEFAULTS.dryHireAccessFeePence,fee_is_flat:true};
 const rate=engineerRateFor(engineer,booking);
 return {pay_hourly_pence:rate,fee_pence:feeFor(rate,booking?.duration_minutes),fee_is_flat:false};
}
export function feeFor(hourlyPence,durationMinutes){
 if(hourlyPence==null)return null;
 return Math.round(Number(hourlyPence)*Number(durationMinutes||0)/60);
}

/** Bookings where the artist chose this engineer (preference or supported-artist agreement) need owner approval before substitution. */
export function substitutionNeedsApproval(booking,engineerUserId){
 const protectedEngineer=booking?.preferred_engineer_user_id||null;
 if(!protectedEngineer&&!booking?.supported_artist_id)return false;
 if(!protectedEngineer)return true;
 return protectedEngineer!==engineerUserId;
}

/**
 * Turn a completed session report into payout lines.
 * Routine sessions pay the agreed fee automatically. Anything unusual is held for the owner.
 */
export function planPayouts({bookedMinutes,actualHours,hourlyPence,agreedFeePence=null,issuesFlagged=false,autoPayouts=true,flatFee=false}){
 if(flatFee){
  // Fixed job price: pay exactly what was agreed; hours don't change it.
  const reasons=[];
  if(agreedFeePence==null)reasons.push('No agreed fee — enter the amount to pay.');
  if(issuesFlagged)reasons.push('Engineer flagged an issue with this session.');
  if(!autoPayouts&&!reasons.length)reasons.push('Automatic payouts are switched off — release manually.');
  return [{kind:'session',hours:null,hourly_pence:null,amount_pence:agreedFeePence==null?0:Math.round(Number(agreedFeePence)),status:reasons.length?'needs_approval':'pending',note:reasons.join(' ')||null}];
 }
 const booked=Math.round(Number(bookedMinutes||0))/60;
 const actual=Number(actualHours||0);
 const rate=hourlyPence==null?null:Number(hourlyPence);
 const lines=[];
 const baseAmount=agreedFeePence!=null?Math.round(Number(agreedFeePence)):rate!=null?feeFor(rate,bookedMinutes):null;
 const reasons=[];
 if(baseAmount==null)reasons.push('No engineer pay rate set — enter the amount to pay.');
 if(issuesFlagged)reasons.push('Engineer flagged an issue with this session.');
 if(actual>0&&actual+1e-9<booked)reasons.push(`Reported ${actual}h against ${booked}h booked.`);
 if(!autoPayouts&&!reasons.length)reasons.push('Automatic payouts are switched off — release manually.');
 lines.push({kind:'session',hours:booked,hourly_pence:rate,amount_pence:baseAmount??0,status:reasons.length?'needs_approval':'pending',note:reasons.join(' ')||null});
 const extra=Math.round((actual-booked)*100)/100;
 if(extra>=0.25){
  lines.push({kind:'extra_time',hours:extra,hourly_pence:rate,amount_pence:rate!=null?Math.round(rate*extra):0,status:'needs_approval',note:`Extra time reported: ${extra}h beyond the ${booked}h booked. Approve to pay.`});
 }
 return lines;
}

export function retryDelayMinutes(attempts){
 if(attempts>=PAYOUT_MAX_ATTEMPTS)return null;
 return RETRY_MINUTES[Math.min(RETRY_MINUTES.length-1,Math.max(0,attempts-1))];
}

export function friendlyStripeError(error){
 const code=error?.code||error?.raw?.code||'';
 if(code==='balance_insufficient')return 'Stripe balance is too low to cover this transfer (common for cash or bank-transfer bookings). Add funds to Stripe or wait for pending card payments — it will retry automatically.';
 if(/capabilit|transfers/i.test(String(error?.message||''))&&/account/i.test(String(error?.message||'')))return 'The engineer’s Stripe account cannot receive transfers yet. Ask them to finish payout setup.';
 return String(error?.message||'Stripe transfer failed').slice(0,400);
}

export const OFFER_STATUS_LABELS={awaiting:'Awaiting response',accepted:'Accepted',assigned:'Assigned directly',needs_owner:'Needs your approval',unfilled:'No engineer accepted'};
export function payoutLabel(p){if(p?.status==='paid'&&p?.paid_via==='outside_stripe')return 'Paid outside Stripe';if(p?.status==='needs_approval'&&p?.funding_source==='off_stripe')return 'Choose how to pay';return PAYOUT_STATUS_LABELS[p?.status]||p?.status;}
export const PAYOUT_STATUS_LABELS={pending:'Scheduled',needs_approval:'Needs approval',on_hold:'Waiting for payout setup',processing:'Sending',paid:'Paid',failed:'Failed — retrying',cancelled:'Cancelled'};

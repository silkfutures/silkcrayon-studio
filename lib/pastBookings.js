import {londonDateTimeToUtc} from './time.js';
export function hasSessionStarted(booking,now=Date.now()){
 const start=londonDateTimeToUtc(booking.booking_date,String(booking.start_time||'').slice(0,5));
 return Boolean(start&&start.getTime()<=now);
}
export function wasRecordedAfterStart(booking){
 return hasSessionStarted(booking,Date.parse(booking.created_at));
}
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function pastSessionEmail(booking,customer,{paid=false,paymentLabel=''}={}){
 return {subject:paid?'Payment received — Silkcrayon session':'Your past Silkcrayon session has been recorded',html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><h1>${paid?'Payment received.':'Session recorded.'}</h1><p>Hi ${esc(customer.artist_name||customer.full_name)}, ${paid?'thank you for your payment for':'we have recorded'} your ${esc(booking.service_name)} session on ${esc(booking.booking_date)} at ${esc(String(booking.start_time).slice(0,5))}.</p><p>${esc(paymentLabel)}</p><p>This relates to a session that has already taken place, not a new booking.</p></div>`};
}

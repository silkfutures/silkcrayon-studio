import {mixAccountingRows} from './mixAccounting.js';
const settled = value => ['paid','part_refunded','refunded'].includes(value);
const sameReceipt = (booking,payment) => payment.booking_id === booking.id && payment.payment_category !== 'extra_time' && (
  (booking.stripe_payment_intent_id && booking.stripe_payment_intent_id === payment.stripe_payment_intent_id) ||
  (booking.stripe_checkout_session_id && booking.stripe_checkout_session_id === payment.stripe_checkout_session_id)
);
export function receiptRows(bookings=[],payments=[],mixes=[]){
 const paidPayments=payments.filter(p=>settled(p.status));
 const links=new Map();
 const bookingRows=bookings.filter(b=>settled(b.payment_status)&&b.payment_method!=='credits'&&!b.project_id).flatMap(b=>{
  const linked=paidPayments.find(p=>sameReceipt(b,p));
  if(linked){links.set(linked.id,b);return []}
  return [{id:b.id,source:'booking',date:b.paid_at||b.created_at,dateEstimated:!b.paid_at,name:b.customers?.artist_name||b.customers?.full_name,email:b.customers?.email,description:b.service_name,amount:Number(b.amount_pence||0),refund:Number(b.refunded_amount_pence||0),status:b.payment_status,kind:'Booking',invoice:b.stripe_invoice_url,number:b.stripe_invoice_number,paymentIntent:b.stripe_payment_intent_id||'',stripePaid:Boolean(b.stripe_payment_intent_id),hours:Number(b.duration_minutes||0)/60}];
 });
 const paymentRows=paidPayments.map(p=>{
  const booking=links.get(p.id),amount=Number(p.amount_pence||0);
  const refund=Math.min(amount,Math.max(Number(p.refunded_amount_pence||0),Number(booking?.refunded_amount_pence||0)));
  return {id:p.id,source:'studio_payment',date:p.paid_at||p.created_at,dateEstimated:!p.paid_at,name:p.customers?.artist_name||p.customers?.full_name,email:p.customers?.email,description:p.description,amount,refund,status:refund>=amount?'refunded':refund>0?'part_refunded':p.status,kind:booking?'Booking':p.kind,category:p.payment_category,invoice:p.stripe_invoice_url||booking?.stripe_invoice_url,number:p.stripe_invoice_number||booking?.stripe_invoice_number,paymentIntent:p.stripe_payment_intent_id||'',stripePaid:Boolean(p.stripe_payment_intent_id||p.stripe_checkout_session_id),hours:booking?Number(booking.duration_minutes||0)/60:Number(p.session_hours||0)};
 });
 return [...bookingRows,...paymentRows,...mixAccountingRows(mixes)].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
export function rowsInMonth(rows,month){
 return rows.filter(row=>row.date&&new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit'}).format(new Date(row.date)).startsWith(month.slice(0,7)));
}
export function receiptNet(rows){return rows.reduce((sum,row)=>sum+Math.max(0,row.amount-row.refund),0)}

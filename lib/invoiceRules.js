// Pure rules for general invoices (any customer, custom lines + past sessions). No database or Stripe imports.
import {documentSeller} from './documentModel.js';

const pence=n=>Math.round(Number(n)||0);
const clip=(v,n)=>String(v??'').trim().slice(0,n);
export const LINE_TYPES=['custom','booking','session'];

function ukDate(v){try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${String(v).slice(0,10)}T12:00:00Z`));}catch{return String(v);}}

/** Clean and validate invoice lines. Qty can be hours (e.g. 2.5). Amount = qty × rate, rounded to the penny. */
export function normaliseLines(input){
 if(!Array.isArray(input)||!input.length)return {ok:false,error:'Add at least one line.'};
 if(input.length>60)return {ok:false,error:'An invoice can have up to 60 lines.'};
 const lines=[];const seen=new Set();
 for(const [i,raw] of input.entries()){
  const type=LINE_TYPES.includes(raw?.type)?raw.type:'custom';
  const qty=Number(raw?.qty??1),rate=pence(raw?.rate_pence);
  if(!Number.isFinite(qty)||qty<=0||qty>1000)return {ok:false,error:`Line ${i+1}: quantity must be more than 0.`};
  if(!Number.isFinite(rate)||rate<0||rate>10000000)return {ok:false,error:`Line ${i+1}: enter a valid rate.`};
  const service=clip(raw?.service,80),description=clip(raw?.description,300);
  if(!service&&!description)return {ok:false,error:`Line ${i+1}: add a service or description.`};
  const date=/^\d{4}-\d{2}-\d{2}$/.test(String(raw?.date||''))?raw.date:null;
  const line={type,date,service,description,qty:Math.round(qty*100)/100,rate_pence:rate,amount_pence:Math.round(qty*rate)};
  if(type==='booking'){if(!raw?.booking_id)return {ok:false,error:`Line ${i+1}: missing session.`};line.booking_id=String(raw.booking_id);if(seen.has('b'+line.booking_id))return {ok:false,error:'The same session is on this invoice twice.'};seen.add('b'+line.booking_id);}
  if(type==='session'){if(!raw?.session_report_id)return {ok:false,error:`Line ${i+1}: missing session report.`};line.session_report_id=String(raw.session_report_id);line.hours=Number(raw?.hours)||line.qty;if(seen.has('s'+line.session_report_id))return {ok:false,error:'The same session is on this invoice twice.'};seen.add('s'+line.session_report_id);}
  lines.push(line);
 }
 const total=lines.reduce((s,l)=>s+l.amount_pence,0);
 if(total<30)return {ok:false,error:'The invoice total must be at least £0.30.'};
 return {ok:true,lines,total};
}

/** How a paid invoice is recorded so every pound appears once in Accounting. */
export function accountingPlan(lines){
 const bookings=lines.filter(l=>l.type==='booking').map(l=>({booking_id:l.booking_id,amount_pence:l.amount_pence}));
 const sessions=lines.filter(l=>l.type==='session').map(l=>({session_report_id:l.session_report_id,amount_pence:l.amount_pence,hours:Number(l.hours||l.qty)||0,description:[l.service,l.description].filter(Boolean).join(' — ')}));
 const custom=lines.filter(l=>l.type==='custom');
 return {bookings,sessions,customTotal:custom.reduce((s,l)=>s+l.amount_pence,0),customDescription:custom.map(l=>[l.service,l.description].filter(Boolean).join(' — ')).join('; ').slice(0,300)};
}

export function invoiceRefGeneral(inv){return inv?.invoice_number?String(inv.invoice_number):`INV-${String(inv?.id||'').slice(0,8).toUpperCase()}`;}

function termsText(inv){if(!inv.due_date)return 'Due on receipt';const days=Math.round((new Date(`${inv.due_date}T12:00:00Z`)-new Date(`${String(inv.issue_date||inv.created_at||new Date().toISOString()).slice(0,10)}T12:00:00Z`))/86400000);return days<=0?'Due on receipt':`${days} day${days===1?'':'s'}`;}

/** Snapshot for the existing PDF renderer. */
export function invoiceDocumentModel(inv,{bank=null,paymentUrl=null}={}){
 const paid=inv.status==='paid',ref=invoiceRefGeneral(inv),total=pence(inv.total_pence);
 const sections=[];
 if(paid)sections.push({title:'Payment received',text:`Paid${inv.paid_at?` on ${ukDate(inv.paid_at)}`:''}${inv.paid_via?` by ${inv.paid_via==='stripe'?'card':String(inv.paid_via).replace('_',' ')}`:''}. Thank you.`});
 else if(!bank?.complete&&!paymentUrl)sections.push({title:'How to pay',text:'Reply to the invoice email and we will send payment details.'});
 if(inv.notes)sections.push({title:'Notes',text:inv.notes});
 return {kind:paid?'receipt':'invoice',seller:documentSeller(),
  customer:{name:inv.bill_to_name||'Customer',email:inv.bill_to_email||'',addressLines:String(inv.bill_to_address||'').split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,6)},
  title:inv.title||'Invoice',reference:inv.id,invoiceRef:ref,
  rows:(inv.lines||[]).map(l=>({date:l.date||'',service:l.service||'',description:l.description||'',qty:l.qty,rate:l.rate_pence,amount:l.amount_pence})),
  lines:(inv.lines||[]).map(l=>({label:[l.service,l.description].filter(Boolean).join(' — '),pence:l.amount_pence})),
  total,received:paid?total:0,refund:0,due:paid?0:total,terms:paid?'Paid':termsText(inv),dueDate:inv.due_date||null,
  payTo:!paid&&bank?.complete?{name:bank.name,accountNumber:bank.accountNumber,sortCode:bank.sortCode,reference:ref}:null,
  paymentUrl:paid?null:paymentUrl,paymentLabel:'Pay this invoice by card',sections,status:''};
}

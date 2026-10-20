// Pure rules for project invoices (deposit / balance / full / custom). No database or Stripe imports.
import {quoteLines} from './quoteTemplates.js';
import {documentSeller} from './documentModel.js';

export const STAGE_LABELS={deposit:'Deposit',balance:'Balance',full:'Full payment',custom:'Payment'};
const pence=n=>Math.max(0,Math.round(Number(n)||0));

export function quoteTotal(project){return quoteLines(project||{}).reduce((s,l)=>s+pence(l.pence),0);}

export function invoiceSummary(project,invoices=[]){
 const total=quoteTotal(project);
 const paid=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+pence(i.amount_pence),0);
 const open=invoices.find(i=>i.status==='sent')||null;
 return {total,paid,open,remaining:Math.max(0,total-paid),openAmount:open?pence(open.amount_pence):0};
}

/** Work out what this invoice is for. Never lets you bill more than what's left on the quote. */
export function planInvoice({stage,percent=50,amountPence=null,description='',summary,title='your project'}){
 const {total,paid,remaining,open}=summary;
 if(open)return {ok:false,error:'This project already has an unpaid invoice. Mark it paid or cancel it before sending another.'};
 if(!total)return {ok:false,error:'Save the quote prices first — the quote total is £0.'};
 if(!remaining)return {ok:false,error:'The full quote has already been paid.'};
 let amount;
 if(stage==='deposit'){
  const pct=Number(percent);
  if(paid)return {ok:false,error:'A payment has already been received — send the balance instead.'};
  if(!Number.isFinite(pct)||pct<5||pct>95)return {ok:false,error:'Deposit must be between 5% and 95%.'};
  amount=Math.round(total*pct/100);
 }else if(stage==='full'){
  if(paid)return {ok:false,error:'A payment has already been received — send the balance instead.'};
  amount=total;
 }else if(stage==='balance'){
  if(!paid)return {ok:false,error:'Nothing has been paid yet — send a deposit or the full amount.'};
  amount=remaining;
 }else if(stage==='custom'){
  amount=pence(amountPence);
 }else return {ok:false,error:'Choose what this invoice is for.'};
 if(amount<30)return {ok:false,error:'The invoice must be at least £0.30.'};
 if(amount>remaining)return {ok:false,error:`That’s more than the £${(remaining/100).toFixed(2)} left to pay on this quote.`};
 const label=stage==='deposit'?`Deposit (${Number(percent)}%)`:STAGE_LABELS[stage];
 const desc=String(description||'').trim().slice(0,140)||`${label} — ${title}`;
 return {ok:true,amount,description:desc,label};
}

export function normaliseBank(map={}){
 const name=String(map.invoice_bank_account_name||'').trim();
 const sort=String(map.invoice_bank_sort_code||'').replace(/\D/g,'');
 const account=String(map.invoice_bank_account_number||'').replace(/\D/g,'');
 const days=Math.min(90,Math.max(0,Math.round(Number(map.invoice_payment_terms_days??7))||0));
 const complete=Boolean(name&&sort.length===6&&account.length===8);
 return {name,sortCode:sort.length===6?`${sort.slice(0,2)}-${sort.slice(2,4)}-${sort.slice(4)}`:sort,accountNumber:account,complete,termsDays:Number.isFinite(days)?days:7};
}
export function validateBank({name,sortCode,accountNumber}){
 const sort=String(sortCode||'').replace(/\D/g,''),acc=String(accountNumber||'').replace(/\D/g,'');
 if(!name&&!sort&&!acc)return {ok:true,empty:true};
 if(!String(name||'').trim())return {ok:false,error:'Enter the account name.'};
 if(sort.length!==6)return {ok:false,error:'Sort code must be 6 digits.'};
 if(acc.length!==8)return {ok:false,error:'Account number must be 8 digits.'};
 return {ok:true,name:String(name).trim().slice(0,70),sort,acc};
}

function ukDate(v){try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`));}catch{return String(v);}}
function termsText(invoice){if(!invoice.due_date)return 'Due on receipt';const issued=String(invoice.created_at||new Date().toISOString()).slice(0,10);const days=Math.round((new Date(`${invoice.due_date}T12:00:00Z`)-new Date(`${issued}T12:00:00Z`))/86400000);return days<=0?'Due on receipt':`${days} day${days===1?'':'s'}`;}
export function invoiceRef(invoice){return invoice?.invoice_number?String(invoice.invoice_number):`SC-P-${String(invoice?.id||'').slice(0,8).toUpperCase()}`;}

/** Snapshot rendered by the existing PDF renderer (kind invoice → receipt once paid). */
export function projectInvoiceDocumentModel(project,invoice,{bank,paymentUrl=null,summary=null}={}){
 const paid=invoice.status==='paid';
 const amount=pence(invoice.amount_pence);
 const ref=invoiceRef(invoice);
 const s=summary||{};
 const notes=[];
 if(paid)notes.push({title:'Payment received',text:`Paid${invoice.paid_at?` on ${ukDate(String(invoice.paid_at).slice(0,10))}`:''}${invoice.paid_via?` by ${invoice.paid_via==='stripe'?'card':invoice.paid_via.replace('_',' ')}`:''}. Thank you.`});
 else if(!bank?.complete&&!paymentUrl)notes.push({title:'How to pay',text:'Reply to the invoice email and we will send payment details.'});
 notes.push({title:'Project',text:`Quote total: £${(pence(invoice.quote_total_pence)/100).toFixed(2)}${invoice.quote_revision?` (quote version ${invoice.quote_revision})`:''}${s.paidBefore!=null?`\nPaid before this invoice: £${(s.paidBefore/100).toFixed(2)}`:''}${s.remainingAfter!=null?`\nLeft to pay after this invoice: £${(s.remainingAfter/100).toFixed(2)}`:''}`});
 const sections=notes;
 const stage=STAGE_LABELS[invoice.stage]||'Payment';
 return {kind:paid?'receipt':'invoice',seller:documentSeller(),customer:{name:project.contact_name||project.company_name||'Customer',artist:project.company_name||'',email:project.email||''},
  title:project.title||'Project',reference:invoice.id,invoiceRef:ref,session:invoice.description,
  lines:[{label:invoice.description,pence:amount}],rows:[{date:String(invoice.created_at||'').slice(0,10)||'',service:stage,description:invoice.description,qty:1,rate:amount,amount}],
  terms:paid?'Paid':termsText(invoice),dueDate:invoice.due_date||null,
  payTo:!paid&&bank?.complete?{name:bank.name,accountNumber:bank.accountNumber,sortCode:bank.sortCode,reference:ref}:null,
  total:amount,received:paid?amount:0,refund:0,due:paid?0:amount,
  totalLabel:'Invoice total',paymentUrl:paid?null:paymentUrl,paymentLabel:'Pay this invoice by card',sections,invoiceId:invoice.id,status:''};
}

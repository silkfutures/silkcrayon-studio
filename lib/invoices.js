// Invoicing: invoice any customer (custom lines and/or past sessions), email it, take card or bank payment,
// and record the money once in Accounting.
import {createHash} from 'node:crypto';
import {newToken,tokenHash} from './customerAuth';
import {getStripe} from './stripe';
import {sendEmail,ownerEmails} from './notifications';
import {renderDocumentPdf} from './documentPdf';
import {projectInvoiceEmail,projectInvoiceReceiptEmail,ownerInvoicePaidEmail} from './projectInvoiceEmails';
import {getInvoiceBank} from './projectInvoices';
import {numbered,documentFilename,numberingEnabled,nextInvoiceNumber} from './documentNumber.js';
import {normaliseLines,accountingPlan,invoiceDocumentModel,invoiceRefGeneral} from './invoiceRules.js';

const nowIso=()=>new Date().toISOString();
const todayLondon=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
function siteUrl(){const c=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');return !c||/silkcrayon-studio\.vercel\.app/i.test(c)?'https://silkcrayon.com':c;}
const SETTLED=['paid','part_refunded','refunded'];

// ---------- what can be billed ----------
export async function billableForCustomer(db,customerId){
 if(!customerId)return {bookings:[],sessions:[]};
 const [{data:bookings=[]},{data:reports=[]},{data:paidReports=[]}]=await Promise.all([
  db.from('bookings').select('id,booking_date,start_time,end_time,duration_minutes,service_name,amount_pence,amount_paid_pence,payment_status,payment_method,project_id,status,invoice_id').eq('customer_id',customerId).in('status',['pending','confirmed','completed']).order('booking_date',{ascending:false}).limit(200),
  db.from('session_reports').select('id,session_date,start_time,actual_hours,work_completed,engineer,invoice_id,booking_id').eq('customer_id',customerId).is('booking_id',null).order('session_date',{ascending:false}).limit(200),
  db.from('studio_payments').select('session_report_id').eq('customer_id',customerId).not('session_report_id','is',null)
 ]);
 const openInvoiceIds=[...new Set([...(bookings||[]),...(reports||[])].map(x=>x.invoice_id).filter(Boolean))];
 const {data:live=[]}=openInvoiceIds.length?await db.from('invoices').select('id,status').in('id',openInvoiceIds):{data:[]};
 const locked=new Set((live||[]).filter(i=>i.status!=='void').map(i=>i.id));
 const paidReportIds=new Set((paidReports||[]).map(p=>p.session_report_id));
 return {
  bookings:(bookings||[]).filter(b=>!SETTLED.includes(b.payment_status)&&b.payment_method!=='credits'&&!b.project_id&&!(b.invoice_id&&locked.has(b.invoice_id)))
   .map(b=>({...b,due_pence:Math.max(0,Number(b.amount_pence||0)-Number(b.amount_paid_pence||0))})).filter(b=>b.due_pence>0),
  sessions:(reports||[]).filter(r=>!paidReportIds.has(r.id)&&!(r.invoice_id&&locked.has(r.invoice_id)))
 };
}

async function lockItems(db,invoice,lines){
 // Re-check every session at save time so two invoices can never claim the same one.
 const plan=accountingPlan(lines);
 for(const b of plan.bookings){
  const {data:row}=await db.from('bookings').select('id,customer_id,invoice_id,payment_status,payment_method,project_id').eq('id',b.booking_id).maybeSingle();
  if(!row||row.customer_id!==invoice.customer_id)return {ok:false,error:'A session on this invoice belongs to another customer.'};
  if(SETTLED.includes(row.payment_status)||row.payment_method==='credits'||row.project_id)return {ok:false,error:'A session on this invoice is already paid or covered by hours/project billing.'};
  if(row.invoice_id&&row.invoice_id!==invoice.id){const {data:other}=await db.from('invoices').select('status,invoice_number').eq('id',row.invoice_id).maybeSingle();if(other&&other.status!=='void')return {ok:false,error:`A session is already on invoice ${other.invoice_number||'(draft)'}.`};}
 }
 for(const s of plan.sessions){
  const {data:row}=await db.from('session_reports').select('id,customer_id,invoice_id,booking_id').eq('id',s.session_report_id).maybeSingle();
  if(!row||row.customer_id!==invoice.customer_id||row.booking_id)return {ok:false,error:'A logged session on this invoice doesn’t belong to this customer.'};
  if(row.invoice_id&&row.invoice_id!==invoice.id){const {data:other}=await db.from('invoices').select('status,invoice_number').eq('id',row.invoice_id).maybeSingle();if(other&&other.status!=='void')return {ok:false,error:`A logged session is already on invoice ${other.invoice_number||'(draft)'}.`};}
 }
 // release anything removed from this invoice, then claim the current items
 await db.from('bookings').update({invoice_id:null}).eq('invoice_id',invoice.id);
 await db.from('session_reports').update({invoice_id:null}).eq('invoice_id',invoice.id);
 if(plan.bookings.length)await db.from('bookings').update({invoice_id:invoice.id}).in('id',plan.bookings.map(b=>b.booking_id));
 if(plan.sessions.length)await db.from('session_reports').update({invoice_id:invoice.id}).in('id',plan.sessions.map(s=>s.session_report_id));
 return {ok:true};
}

// ---------- drafts ----------
export async function saveDraft(db,{id=null,input,ctx}){
 const name=String(input?.billToName||'').trim().slice(0,120),email=String(input?.billToEmail||'').trim().toLowerCase().slice(0,254);
 if(!name)return {ok:false,status:400,error:'Who is the invoice to?'};
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,status:400,error:'Enter a valid email.'};
 const norm=normaliseLines(input?.lines);if(!norm.ok)return {ok:false,status:400,error:norm.error};
 const customerId=input?.customerId||null;
 const billingContactId=input?.billingContactId||null;
 if(billingContactId){const {data:co}=await db.from('billing_contacts').select('id').eq('id',billingContactId).maybeSingle();if(!co)return {ok:false,status:400,error:'That company no longer exists.'};}
 if(!customerId&&norm.lines.some(l=>l.type!=='custom'))return {ok:false,status:400,error:'Choose whose sessions these are (the artist) to add sessions.'};
 const due=/^\d{4}-\d{2}-\d{2}$/.test(String(input?.dueDate||''))?input.dueDate:null;
 const row={customer_id:customerId,billing_contact_id:billingContactId,bill_to_name:name,bill_to_email:email||null,bill_to_address:String(input?.billToAddress||'').trim().slice(0,400)||null,title:String(input?.title||'').trim().slice(0,120)||null,lines:norm.lines,total_pence:norm.total,due_date:due,notes:String(input?.notes||'').trim().slice(0,1000)||null,updated_at:nowIso()};
 let invoice;
 if(id){
  const {data:existing}=await db.from('invoices').select('id,status').eq('id',id).maybeSingle();
  if(!existing)return {ok:false,status:404,error:'Invoice not found.'};
  if(existing.status!=='draft')return {ok:false,status:409,error:'Only drafts can be edited. Cancel the invoice and create a new one to change it.'};
  const {data,error}=await db.from('invoices').update(row).eq('id',id).eq('status','draft').select('*').single();if(error)throw error;invoice=data;
 }else{
  const {data,error}=await db.from('invoices').insert({...row,status:'draft',issue_date:todayLondon(),created_by_user_id:ctx?.user?.id||null}).select('*').single();if(error)throw error;invoice=data;
 }
 const lock=await lockItems(db,invoice,norm.lines);
 if(!lock.ok){if(!id){await db.from('invoices').delete().eq('id',invoice.id);}return {ok:false,status:409,error:lock.error};}
 return {ok:true,invoice};
}

export async function deleteDraft(db,{id}){
 const {data}=await db.from('invoices').select('id,status').eq('id',id).maybeSingle();
 if(!data||data.status!=='draft')return {ok:false,error:'Only drafts can be deleted.'};
 await db.from('bookings').update({invoice_id:null}).eq('invoice_id',id);
 await db.from('session_reports').update({invoice_id:null}).eq('invoice_id',id);
 await db.from('invoices').delete().eq('id',id).eq('status','draft');
 return {ok:true};
}

// ---------- documents + email ----------
async function storeDocument(db,invoice,{bank,paymentUrl}){
 const snapshot=invoiceDocumentModel(invoice,{bank,paymentUrl});
 const fingerprint=createHash('sha256').update(JSON.stringify({source:'invoice',id:invoice.id,snapshot})).digest('hex');
 const {data:old}=await db.from('studio_documents').select('*').eq('fingerprint',fingerprint).maybeSingle();if(old)return numbered(old);
 const display_number=invoice.invoice_number&&/^\d+$/.test(invoice.invoice_number)?invoice.invoice_number:null;
 const {data,error}=await db.from('studio_documents').insert({source_type:'invoice',source_id:invoice.id,kind:snapshot.kind,snapshot,fingerprint,...(display_number?{display_number}:{})}).select('*').single();
 if(error?.code==='23505'){const {data:again}=await db.from('studio_documents').select('*').eq('fingerprint',fingerprint).single();return numbered(again);}
 if(error)throw error;return numbered(data);
}
const asProject=inv=>({contact_name:inv.bill_to_name,title:inv.title||'Silkcrayon Studios',email:inv.bill_to_email});
const asInvoice=inv=>({...inv,amount_pence:inv.total_pence,description:inv.title||((inv.lines||[]).length===1?[inv.lines[0].service,inv.lines[0].description].filter(Boolean).join(' — '):`${(inv.lines||[]).length} items`)});

async function emailInvoice(db,invoice,token){
 const bank=await getInvoiceBank(db),payUrl=`${siteUrl()}/pay/${token}`;
 const doc=await storeDocument(db,invoice,{bank,paymentUrl:payUrl});
 const bytes=await renderDocumentPdf(doc);
 const msg=projectInvoiceEmail({project:asProject(invoice),invoice:asInvoice(invoice),bank,payUrl,ref:invoiceRefGeneral(invoice)});
 const r=await sendEmail({to:invoice.bill_to_email,...msg,attachments:[{filename:documentFilename(doc),content:bytes.toString('base64'),content_type:'application/pdf'}],source:`Invoice ${invoiceRefGeneral(invoice)}`});
 await db.from('invoices').update({document_id:doc.id,sent_to:invoice.bill_to_email,sent_at:r.ok?nowIso():invoice.sent_at||null,email_error:r.ok?null:String(r.error||'Email failed').slice(0,300),updated_at:nowIso()}).eq('id',invoice.id);
 return {ok:r.ok,error:r.error,documentId:doc.id,bankMissing:!bank.complete};
}

/** Draft → sent: gives it its number (e.g. 1155), a payment link, a PDF, and emails the customer. */
export async function sendInvoice(db,{id}){
 const {data:inv}=await db.from('invoices').select('*').eq('id',id).maybeSingle();
 if(!inv)return {ok:false,status:404,error:'Invoice not found.'};
 if(inv.status!=='draft')return {ok:false,status:409,error:'This invoice has already been sent.'};
 if(!inv.bill_to_email)return {ok:false,status:400,error:'Add an email address to send the invoice.'};
 const lock=await lockItems(db,inv,inv.lines||[]);if(!lock.ok)return {ok:false,status:409,error:lock.error};
 const number=inv.invoice_number||(await numberingEnabled(db)?await nextInvoiceNumber(db):null);
 const token=newToken();
 const {data:sent}=await db.from('invoices').update({status:'sent',invoice_number:number,pay_token_hash:tokenHash(token),issue_date:todayLondon(),updated_at:nowIso()}).eq('id',id).eq('status','draft').select('*').maybeSingle();
 if(!sent)return {ok:false,status:409,error:'This invoice changed — refresh and try again.'};
 const r=await emailInvoice(db,sent,token);
 return {ok:true,emailed:r.ok,emailError:r.ok?null:r.error,number:invoiceRefGeneral(sent),bankMissing:r.bankMissing};
}

export async function resendInvoice(db,{id}){
 const {data:inv}=await db.from('invoices').select('*').eq('id',id).maybeSingle();
 if(!inv||inv.status!=='sent')return {ok:false,error:'Only unpaid sent invoices can be resent.'};
 const token=newToken();
 await db.from('invoices').update({pay_token_hash:tokenHash(token),updated_at:nowIso()}).eq('id',id).eq('status','sent');
 const r=await emailInvoice(db,inv,token);
 return r.ok?{ok:true}:{ok:false,error:`Email failed: ${r.error||'unknown error'}`};
}

// ---------- card payments ----------
export async function generalInvoiceByToken(db,token){
 if(!token||String(token).length<20)return null;
 const {data}=await db.from('invoices').select('*').eq('pay_token_hash',tokenHash(String(token))).maybeSingle();
 return data||null;
}

export async function startGeneralCardPayment(db,{token,stripe=null}){
 const inv=await generalInvoiceByToken(db,token);
 if(!inv)return {ok:false,status:404,error:'This payment link is not valid.'};
 if(inv.status==='paid')return {ok:false,status:409,paid:true,error:'This invoice has already been paid. Thank you!'};
 if(inv.status!=='sent')return {ok:false,status:409,error:'This invoice has been cancelled. Please contact the studio.'};
 stripe=stripe||getStripe();
 if(inv.stripe_checkout_session_id){try{const old=await stripe.checkout.sessions.retrieve(inv.stripe_checkout_session_id);if(old.payment_status==='paid')return {ok:false,status:409,paid:true,error:'Your payment is being confirmed. Thank you!'};if(old.status==='open')return {ok:true,url:old.url};}catch{}}
 const ref=invoiceRefGeneral(inv);
 const session=await stripe.checkout.sessions.create({mode:'payment',customer_email:inv.bill_to_email||undefined,
  metadata:{invoice_id:inv.id,payment_kind:'invoice'},
  line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:inv.total_pence,product_data:{name:`Silkcrayon — Invoice ${ref}`,description:(asInvoice(inv).description||'Studio services').slice(0,500)}}}],
  success_url:`${siteUrl()}/pay/${token}?paid=1`,cancel_url:`${siteUrl()}/pay/${token}`},{idempotencyKey:`sc-ginv-${inv.id}-${Math.floor(Date.now()/60000)}`});
 await db.from('invoices').update({stripe_checkout_session_id:session.id,updated_at:nowIso()}).eq('id',inv.id).eq('status','sent');
 return {ok:true,url:session.url};
}

async function checkoutState(db,inv,stripe){
 if(!inv.stripe_checkout_session_id)return {paid:false};
 try{stripe=stripe||getStripe();const s=await stripe.checkout.sessions.retrieve(inv.stripe_checkout_session_id);if(s.payment_status==='paid')return {paid:true,session:s};if(s.status==='open')await stripe.checkout.sessions.expire(s.id);return {paid:false};}
 catch(e){return {error:e?.message||'Stripe unavailable'};}
}

// ---------- paid: record the money once ----------
async function finalisePaid(db,{inv,via,note=null,ctx=null,paymentIntent=null}){
 const at=nowIso();
 const {data:paid}=await db.from('invoices').update({status:'paid',paid_at:at,paid_via:via,paid_note:note,marked_paid_by_user_id:ctx?.user?.id||null,stripe_payment_intent_id:paymentIntent,updated_at:at}).eq('id',inv.id).eq('status','sent').select('*').maybeSingle();
 if(!paid)return {ok:false,error:'This invoice is no longer open.'};
 const plan=accountingPlan(paid.lines||[]),ref=invoiceRefGeneral(paid),method=via==='stripe'?'stripe':via;
 // 1. Past bookings → marked paid at the invoiced price (they appear in Accounting as booking revenue).
 for(const b of plan.bookings){
  const {data:row}=await db.from('bookings').select('id,amount_pence,amount_paid_pence,payment_status').eq('id',b.booking_id).maybeSingle();
  if(!row||SETTLED.includes(row.payment_status))continue;
  const before=Math.max(0,Number(row.amount_paid_pence||0));
  await db.from('bookings').update({payment_status:'paid',payment_method:method,amount_pence:before+b.amount_pence,amount_paid_pence:before+b.amount_pence,paid_at:at,hold_expires_at:null,updated_at:at}).eq('id',row.id).not('payment_status','in','(paid,part_refunded,refunded)');
 }
 // 2. Logged sessions without a booking → one payment each (keeps paid hours right).
 for(const s of plan.sessions){
  if(s.amount_pence<=0)continue;
  await db.from('studio_payments').insert({customer_id:paid.customer_id,session_report_id:s.session_report_id,invoice_id:paid.id,created_by_user_id:ctx?.user?.id||null,created_by_name:ctx?.profile?.full_name||null,kind:'session',description:`Invoice ${ref} — ${s.description||'Studio session'}`.slice(0,300),amount_pence:s.amount_pence,list_amount_pence:s.amount_pence,hours_credit:0,session_hours:s.hours,status:'paid',paid_at:at,payment_method:method,payment_category:'invoice_session',stripe_payment_intent_id:paymentIntent,discount_code:'none',discount_percent:0,discount_amount_pence:0});
 }
 // 3. Everything else on the invoice → one payment.
 if(plan.customTotal>0){
  await db.from('studio_payments').insert({customer_id:paid.customer_id,invoice_id:paid.id,created_by_user_id:ctx?.user?.id||null,created_by_name:ctx?.profile?.full_name||null,kind:'other',description:`Invoice ${ref} — ${plan.customDescription||paid.title||'Studio services'}`.slice(0,300),amount_pence:plan.customTotal,list_amount_pence:plan.customTotal,hours_credit:0,status:'paid',paid_at:at,payment_method:method,payment_category:'invoice',stripe_payment_intent_id:paymentIntent,discount_code:'none',discount_percent:0,discount_amount_pence:0});
 }
 // Receipt to the customer (same number as the invoice).
 try{
  if(paid.bill_to_email){const doc=await storeDocument(db,paid,{bank:null,paymentUrl:null});await db.from('invoices').update({receipt_document_id:doc.id}).eq('id',paid.id);const bytes=await renderDocumentPdf(doc);await sendEmail({to:paid.bill_to_email,...projectInvoiceReceiptEmail({project:asProject(paid),invoice:asInvoice(paid),ref}),attachments:[{filename:documentFilename(doc),content:bytes.toString('base64'),content_type:'application/pdf'}],source:`Receipt ${ref}`});}
 }catch(e){console.error('Invoice receipt failed',e?.message||e);}
 if(via==='stripe'){const msg=ownerInvoicePaidEmail({project:asProject(paid),invoice:asInvoice(paid),ref,via:'card (Stripe)'});for(const to of await ownerEmails())await sendEmail({to,...msg,source:'invoice_paid'});}
 return {ok:true};
}

export async function markInvoicePaid(db,{id,method,note,ctx,stripe=null}){
 if(!['bank_transfer','cash','other'].includes(method))return {ok:false,error:'Choose how it was paid.'};
 const {data:inv}=await db.from('invoices').select('*').eq('id',id).maybeSingle();
 if(!inv||inv.status!=='sent')return {ok:false,error:'This invoice is not open.'};
 const c=await checkoutState(db,inv,stripe);
 if(c.error)return {ok:false,error:'Couldn’t confirm with Stripe that the customer hasn’t just paid by card. Try again in a minute.'};
 if(c.paid){await finalisePaid(db,{inv,via:'stripe',paymentIntent:typeof c.session.payment_intent==='string'?c.session.payment_intent:null});return {ok:false,error:'The customer has already paid this invoice by card — it’s now marked paid. Don’t take the bank transfer as well.'};}
 return finalisePaid(db,{inv,via:method,note:String(note||'').slice(0,300)||null,ctx});
}

export async function voidInvoice(db,{id,stripe=null}){
 const {data:inv}=await db.from('invoices').select('*').eq('id',id).maybeSingle();
 if(!inv||inv.status!=='sent')return {ok:false,error:'Only unpaid sent invoices can be cancelled (delete drafts instead).'};
 const c=await checkoutState(db,inv,stripe);
 if(c.error)return {ok:false,error:'Couldn’t confirm with Stripe that the customer hasn’t just paid. Try again in a minute.'};
 if(c.paid){await finalisePaid(db,{inv,via:'stripe',paymentIntent:typeof c.session.payment_intent==='string'?c.session.payment_intent:null});return {ok:false,error:'The customer has already paid this by card, so it can’t be cancelled — it’s now marked paid.'};}
 const {data}=await db.from('invoices').update({status:'void',voided_at:nowIso(),pay_token_hash:null,updated_at:nowIso()}).eq('id',id).eq('status','sent').select('id').maybeSingle();
 if(data){await db.from('bookings').update({invoice_id:null}).eq('invoice_id',id);await db.from('session_reports').update({invoice_id:null}).eq('invoice_id',id);}
 return data?{ok:true}:{ok:false,error:'Invoice changed — refresh.'};
}

/** Stripe webhook: Checkout for a general invoice completed. */
export async function onInvoiceCheckoutPaid(db,session){
 const id=session?.metadata?.invoice_id;if(!id)return {handled:false};
 const {data:inv}=await db.from('invoices').select('*').eq('id',id).maybeSingle();
 if(!inv)return {handled:true,missing:true};
 if(inv.status==='paid')return {handled:true,duplicate:true};
 const pi=typeof session.payment_intent==='string'?session.payment_intent:null;
 if(inv.status==='void'){const msg=ownerInvoicePaidEmail({project:asProject(inv),invoice:asInvoice(inv),ref:invoiceRefGeneral(inv),via:'card (Stripe)',warning:'The customer paid an invoice you had cancelled. Refund it in Stripe if it is not owed.'});for(const to of await ownerEmails())await sendEmail({to,...msg,source:'invoice_paid_after_void'});return {handled:true,warning:'void'};}
 return {handled:true,...await finalisePaid(db,{inv,via:'stripe',paymentIntent:pi})};
}

// ---------- duplicate ----------
/** Copy an invoice (Studio OS or past QuickBooks) into a new draft dated today. Session links are not copied —
 *  every line becomes a normal line with the same service, description, qty and price. */
export async function duplicateInvoice(db,{fromInvoiceId=null,fromQuickbooksId=null,ctx}){
 let input;
 if(fromInvoiceId){
  const {data:src}=await db.from('invoices').select('*').eq('id',fromInvoiceId).maybeSingle();
  if(!src)return {ok:false,status:404,error:'Invoice not found.'};
  input={customerId:src.customer_id,billingContactId:src.billing_contact_id,billToName:src.bill_to_name,billToEmail:src.bill_to_email,billToAddress:src.bill_to_address,title:src.title,notes:src.notes,
   lines:(src.lines||[]).map(l=>({type:'custom',date:todayLondon(),service:l.service,description:l.description,qty:l.qty,rate_pence:l.rate_pence}))};
 }else if(fromQuickbooksId){
  const {data:q}=await db.from('quickbooks_invoices').select('*').eq('id',fromQuickbooksId).maybeSingle();
  if(!q)return {ok:false,status:404,error:'QuickBooks invoice not found.'};
  const key=String(q.customer_name||'').toLowerCase().replace(/\s+/g,' ').trim();
  const [{data:co},{data:qc},{data:cust}]=await Promise.all([
   db.from('billing_contacts').select('*').eq('name_key',key).eq('archived',false).maybeSingle(),
   db.from('quickbooks_customers').select('email,billing_address').eq('display_key',key).maybeSingle(),
   q.customer_id?db.from('customers').select('id,full_name,artist_name,email').eq('id',q.customer_id).maybeSingle():Promise.resolve({data:null})]);
  const lines=(q.lines||[]).filter(l=>Number(l.amount_pence)>0).map(l=>({type:'custom',date:todayLondon(),service:l.account&&!/^(services|sales)$/i.test(l.account)?l.account:'Services',description:l.description||q.memo||'',qty:1,rate_pence:Number(l.amount_pence)}));
  input={customerId:co?null:cust?.id||null,billingContactId:co?.id||null,
   billToName:co?.name||cust?.full_name||q.customer_name||'Customer',billToEmail:co?.email||cust?.email||qc?.email||q.customer_email||'',
   billToAddress:co?[co.contact_name?`FAO ${co.contact_name}`:null,co.address].filter(Boolean).join('\n'):qc?.billing_address||'',
   lines:lines.length?lines:[{type:'custom',date:todayLondon(),service:'Services',description:q.memo||'',qty:1,rate_pence:Math.max(30,Number(q.amount_pence)||0)}]};
 }else return {ok:false,status:400,error:'Choose an invoice to duplicate.'};
 const bank=await getInvoiceBank(db).catch(()=>({termsDays:7}));
 input.dueDate=new Date(Date.now()+(bank.termsDays??7)*86400000).toISOString().slice(0,10);
 return saveDraft(db,{input,ctx});
}

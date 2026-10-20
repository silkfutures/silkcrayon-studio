// "Invoice this quote": send deposit / balance / full invoices, take card payments, record bank transfers.
import {createHash} from 'node:crypto';
import {newToken,tokenHash} from './customerAuth';
import {getStripe} from './stripe';
import {sendEmail,ownerEmails} from './notifications';
import {renderDocumentPdf} from './documentPdf';
import {projectInvoiceEmail,projectInvoiceReceiptEmail,ownerInvoicePaidEmail} from './projectInvoiceEmails';
import {invoiceSummary,planInvoice,normaliseBank,projectInvoiceDocumentModel,invoiceRef} from './projectInvoiceRules.js';

const nowIso=()=>new Date().toISOString();
function siteUrl(){const c=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');return !c||/silkcrayon-studio\.vercel\.app/i.test(c)?'https://silkcrayon.com':c;}
const payUrlFor=token=>`${siteUrl()}/pay/${token}`;
import {numbered,documentFilename,numberingEnabled,nextInvoiceNumber} from './documentNumber.js';

export async function getInvoiceBank(db){
 const {data}=await db.from('studio_settings').select('key,value').like('key','invoice_%');
 return normaliseBank(Object.fromEntries((data||[]).map(x=>[x.key,x.value])));
}

export async function loadProjectInvoices(db,projectId){
 const [{data:project,error},{data:invoices=[]}]=await Promise.all([
  db.from('studio_projects').select('*').eq('id',projectId).maybeSingle(),
  db.from('project_invoices').select('*').eq('project_id',projectId).order('created_at')
 ]);
 if(error)throw error;
 return {project,invoices:invoices||[],summary:project?invoiceSummary(project,invoices||[]):null};
}

async function storeDocument(db,project,invoice,{bank,paymentUrl,summary}){
 const snapshot=projectInvoiceDocumentModel(project,invoice,{bank,paymentUrl,summary});
 const fingerprint=createHash('sha256').update(JSON.stringify({source:'project_invoice',id:invoice.id,snapshot})).digest('hex');
 const {data:old}=await db.from('studio_documents').select('*').eq('fingerprint',fingerprint).maybeSingle();
 if(old)return numbered(old);
 // Invoice and its receipt share the invoice's number (e.g. 1155).
 const display_number=invoice.invoice_number||(['invoice','receipt'].includes(snapshot.kind)&&await numberingEnabled(db)?await nextInvoiceNumber(db):null);
 const {data,error}=await db.from('studio_documents').insert({source_type:'project',source_id:project.id,kind:snapshot.kind,snapshot,fingerprint,...(display_number?{display_number}:{})}).select('*').single();
 if(error?.code==='23505'){const {data:again}=await db.from('studio_documents').select('*').eq('fingerprint',fingerprint).single();return numbered(again);}
 if(error)throw error;
 return numbered(data);
}

async function emailInvoice(db,{project,invoice,bank,token,summary}){
 const payUrl=payUrlFor(token);
 const doc=await storeDocument(db,project,invoice,{bank,paymentUrl:payUrl,summary});
 const bytes=await renderDocumentPdf(doc);
 const msg=projectInvoiceEmail({project,invoice,bank,payUrl,ref:invoiceRef(invoice)});
 const r=await sendEmail({to:project.email,...msg,attachments:[{filename:documentFilename(doc),content:bytes.toString('base64'),content_type:'application/pdf'}],source:`Project invoice · ${invoiceRef(invoice)}`});
 await db.from('project_invoices').update({document_id:doc.id,sent_to:project.email,sent_at:r.ok?nowIso():invoice.sent_at||null,email_error:r.ok?null:String(r.error||'Email failed').slice(0,300),updated_at:nowIso()}).eq('id',invoice.id);
 return {ok:r.ok,error:r.error,documentId:doc.id,number:doc.number};
}

export async function createProjectInvoice(db,{projectId,stage,percent,amountPence,description,dueDate,ctx}){
 const {project,summary}=await loadProjectInvoices(db,projectId);
 if(!project)return {ok:false,status:404,error:'Project not found.'};
 if(!project.email)return {ok:false,status:400,error:'Add a customer email to this project first.'};
 const plan=planInvoice({stage,percent,amountPence,description,summary,title:project.title});
 if(!plan.ok)return {ok:false,status:409,error:plan.error};
 const bank=await getInvoiceBank(db);
 const due=/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate||''))?dueDate:new Date(Date.now()+bank.termsDays*86400000).toISOString().slice(0,10);
 const token=newToken();
 const invoice_number=await numberingEnabled(db)?await nextInvoiceNumber(db):null;
 const {data:invoice,error}=await db.from('project_invoices').insert({project_id:project.id,...(invoice_number?{invoice_number}:{}),stage,description:plan.description,amount_pence:plan.amount,quote_total_pence:summary.total,quote_revision:project.quote_revision||null,status:'sent',due_date:due,pay_token_hash:tokenHash(token),created_by_user_id:ctx?.user?.id||null}).select('*').single();
 if(error){if(error.code==='23505')return {ok:false,status:409,error:'This project already has an unpaid invoice.'};throw error;}
 const projectPatch={updated_at:nowIso()};
 if(stage==='deposit'){projectPatch.deposit_amount_pence=plan.amount;if(['quoted','accepted'].includes(project.status))projectPatch.status='deposit_due';}
 await db.from('studio_projects').update(projectPatch).eq('id',project.id);
 const sent=await emailInvoice(db,{project,invoice,bank,token,summary:{paidBefore:summary.paid,remainingAfter:summary.remaining-plan.amount}});
 return {ok:true,invoiceId:invoice.id,emailed:sent.ok,emailError:sent.ok?null:sent.error,number:sent.number,bankMissing:!bank.complete};
}

export async function resendProjectInvoice(db,{invoiceId}){
 const {data:invoice}=await db.from('project_invoices').select('*').eq('id',invoiceId).maybeSingle();
 if(!invoice||invoice.status!=='sent')return {ok:false,error:'Only unpaid invoices can be resent.'};
 const {project,invoices}=await loadProjectInvoices(db,invoice.project_id);
 // New link each time; the previous email's link stops working.
 const token=newToken();
 await db.from('project_invoices').update({pay_token_hash:tokenHash(token),updated_at:nowIso()}).eq('id',invoice.id).eq('status','sent');
 const paidBefore=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount_pence,0);
 const r=await emailInvoice(db,{project,invoice,bank:await getInvoiceBank(db),token,summary:{paidBefore,remainingAfter:Math.max(0,invoice.quote_total_pence-paidBefore-invoice.amount_pence)}});
 return r.ok?{ok:true}:{ok:false,error:`Email failed: ${r.error||'unknown error'}`};
}

export async function invoiceByToken(db,token){
 if(!token||String(token).length<20)return null;
 const {data}=await db.from('project_invoices').select('*,studio_projects(id,title,contact_name,email,customer_id)').eq('pay_token_hash',tokenHash(String(token))).maybeSingle();
 return data||null;
}

/** Customer pressed "Pay by card": one studio_payments row per invoice, fresh Stripe Checkout each time. */
export async function startCardPayment(db,{token,stripe=null}){
 const invoice=await invoiceByToken(db,token);
 if(!invoice)return {ok:false,status:404,error:'This payment link is not valid.'};
 if(invoice.status==='paid')return {ok:false,status:409,paid:true,error:'This invoice has already been paid. Thank you!'};
 if(invoice.status!=='sent')return {ok:false,status:409,error:'This invoice has been cancelled. Please contact the studio.'};
 const project=invoice.studio_projects||{};
 stripe=stripe||getStripe();
 let paymentId=invoice.studio_payment_id;
 if(paymentId){
  const {data:pay}=await db.from('studio_payments').select('id,status,stripe_checkout_session_id').eq('id',paymentId).maybeSingle();
  if(pay?.status==='paid')return {ok:false,status:409,paid:true,error:'This invoice has already been paid. Thank you!'};
  // If an earlier checkout is still open and already paid, never start a second one.
  if(pay?.stripe_checkout_session_id){try{const old=await stripe.checkout.sessions.retrieve(pay.stripe_checkout_session_id);if(old.payment_status==='paid')return {ok:false,status:409,paid:true,error:'Your payment is being confirmed. Thank you!'};if(old.status==='open')return {ok:true,url:old.url};}catch{}}
  await db.from('studio_payments').update({status:'pending',updated_at:nowIso()}).eq('id',paymentId).neq('status','paid');
 }else{
  const {data:pay,error}=await db.from('studio_payments').insert({customer_id:project.customer_id||null,kind:'other',description:`${invoice.description} (${invoiceRef(invoice)})`,amount_pence:invoice.amount_pence,list_amount_pence:invoice.amount_pence,hours_credit:0,status:'pending',payment_category:`project_${invoice.stage}`,discount_code:'none',discount_percent:0,discount_amount_pence:0}).select('id').single();
  if(error)throw error;paymentId=pay.id;
  const {data:linked}=await db.from('project_invoices').update({studio_payment_id:paymentId,updated_at:nowIso()}).eq('id',invoice.id).is('studio_payment_id',null).select('studio_payment_id').maybeSingle();
  if(!linked){await db.from('studio_payments').delete().eq('id',paymentId);const {data:again}=await db.from('project_invoices').select('studio_payment_id').eq('id',invoice.id).single();paymentId=again.studio_payment_id;}
 }
 const session=await stripe.checkout.sessions.create({mode:'payment',invoice_creation:{enabled:true},customer_email:project.email||undefined,client_reference_id:paymentId,
  metadata:{studio_payment_id:paymentId,project_invoice_id:invoice.id,project_id:invoice.project_id,payment_kind:'project_invoice'},
  line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:invoice.amount_pence,product_data:{name:`Silkcrayon — ${invoice.description}`.slice(0,250),description:`Invoice ${invoiceRef(invoice)} · ${project.title||'Project'}`.slice(0,500)}}}],
  success_url:`${siteUrl()}/pay/${token}?paid=1`,cancel_url:`${siteUrl()}/pay/${token}`},{idempotencyKey:`sc-inv-${invoice.id}-${Math.floor(Date.now()/60000)}`});
 await db.from('studio_payments').update({stripe_checkout_session_id:session.id,updated_at:nowIso()}).eq('id',paymentId);
 return {ok:true,url:session.url};
}

async function closeOpenCheckout(db,invoice,stripe){
 if(!invoice.studio_payment_id)return {paid:false};
 const {data:pay}=await db.from('studio_payments').select('id,status,stripe_checkout_session_id').eq('id',invoice.studio_payment_id).maybeSingle();
 if(pay?.status==='paid')return {paid:true};
 if(!pay?.stripe_checkout_session_id)return {paid:false};
 try{
  stripe=stripe||getStripe();
  const s=await stripe.checkout.sessions.retrieve(pay.stripe_checkout_session_id);
  if(s.payment_status==='paid')return {paid:true,session:s};
  if(s.status==='open')await stripe.checkout.sessions.expire(s.id);
  return {paid:false};
 }catch(e){return {error:e?.message||'Stripe unavailable'};}
}

async function finalisePaid(db,{invoice,via,note=null,ctx=null,session=null}){
 const at=nowIso();
 const {data:updated}=await db.from('project_invoices').update({status:'paid',paid_at:at,paid_via:via,paid_note:note,marked_paid_by_user_id:ctx?.user?.id||null,updated_at:at}).eq('id',invoice.id).eq('status','sent').select('*').maybeSingle();
 if(!updated)return {ok:false,error:'This invoice is no longer open.'};
 // Record the money once in studio_payments so Accounting/revenue include it.
 if(via!=='stripe'){
  if(updated.studio_payment_id)await db.from('studio_payments').update({status:'paid',paid_at:at,payment_method:via,stripe_checkout_session_id:null,updated_at:at}).eq('id',updated.studio_payment_id).neq('status','paid');
  else{const {data:project}=await db.from('studio_projects').select('customer_id').eq('id',updated.project_id).maybeSingle();const {data:pay}=await db.from('studio_payments').insert({customer_id:project?.customer_id||null,created_by_user_id:ctx?.user?.id||null,created_by_name:ctx?.profile?.full_name||null,kind:'other',description:`${updated.description} (${invoiceRef(updated)})`,amount_pence:updated.amount_pence,list_amount_pence:updated.amount_pence,hours_credit:0,status:'paid',paid_at:at,payment_method:via,payment_category:`project_${updated.stage}`,discount_code:'none',discount_percent:0,discount_amount_pence:0}).select('id').single();if(pay)await db.from('project_invoices').update({studio_payment_id:pay.id}).eq('id',updated.id);}
 }
 const {project,invoices}=await loadProjectInvoices(db,updated.project_id);
 if(updated.stage==='deposit'&&project?.status==='deposit_due')await db.from('studio_projects').update({status:'scheduled',updated_at:at}).eq('id',project.id);
 // Receipt to the customer.
 try{
  const paidTotal=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount_pence,0);
  const doc=await storeDocument(db,project,updated,{bank:null,paymentUrl:null,summary:{paidBefore:paidTotal-updated.amount_pence,remainingAfter:Math.max(0,updated.quote_total_pence-paidTotal)}});
  await db.from('project_invoices').update({receipt_document_id:doc.id}).eq('id',updated.id);
  if(project?.email){const bytes=await renderDocumentPdf(doc);await sendEmail({to:project.email,...projectInvoiceReceiptEmail({project,invoice:updated,ref:invoiceRef(updated)}),attachments:[{filename:documentFilename(doc),content:bytes.toString('base64'),content_type:'application/pdf'}],source:`Project receipt · ${invoiceRef(updated)}`});}
 }catch(e){console.error('Project receipt failed',e?.message||e);}
 if(via==='stripe'){const msg=ownerInvoicePaidEmail({project,invoice:updated,ref:invoiceRef(updated),via:'card (Stripe)'});for(const to of await ownerEmails())await sendEmail({to,...msg,source:'project_invoice_paid'});}
 return {ok:true};
}

/** Owner: "Mark as paid" (bank transfer / cash / other). Refuses if the customer has already paid by card. */
export async function markProjectInvoicePaid(db,{invoiceId,method,note,ctx,stripe=null}){
 if(!['bank_transfer','cash','other'].includes(method))return {ok:false,error:'Choose how it was paid.'};
 const {data:invoice}=await db.from('project_invoices').select('*').eq('id',invoiceId).maybeSingle();
 if(!invoice||invoice.status!=='sent')return {ok:false,error:'This invoice is not open.'};
 const check=await closeOpenCheckout(db,invoice,stripe);
 if(check.error)return {ok:false,error:'Couldn’t confirm with Stripe that the customer hasn’t just paid by card. Try again in a minute.'};
 if(check.paid){if(check.session)await finalisePaid(db,{invoice,via:'stripe',session:check.session});return {ok:false,error:'The customer has already paid this invoice by card — it’s now marked paid. Don’t take the bank transfer as well.'};}
 return finalisePaid(db,{invoice,via:method,note:String(note||'').slice(0,300)||null,ctx});
}

export async function voidProjectInvoice(db,{invoiceId,stripe=null}){
 const {data:invoice}=await db.from('project_invoices').select('*').eq('id',invoiceId).maybeSingle();
 if(!invoice||invoice.status!=='sent')return {ok:false,error:'Only unpaid invoices can be cancelled.'};
 const check=await closeOpenCheckout(db,invoice,stripe);
 if(check.error)return {ok:false,error:'Couldn’t confirm with Stripe that the customer hasn’t just paid. Try again in a minute.'};
 if(check.paid){if(check.session)await finalisePaid(db,{invoice,via:'stripe',session:check.session});return {ok:false,error:'The customer has already paid this by card, so it can’t be cancelled — it’s now marked paid.'};}
 const {data}=await db.from('project_invoices').update({status:'void',voided_at:nowIso(),pay_token_hash:null,updated_at:nowIso()}).eq('id',invoice.id).eq('status','sent').select('id').maybeSingle();
 if(invoice.studio_payment_id)await db.from('studio_payments').update({status:'cancelled',updated_at:nowIso()}).eq('id',invoice.studio_payment_id).neq('status','paid');
 return data?{ok:true}:{ok:false,error:'Invoice changed — refresh.'};
}

/** Stripe webhook: a studio payment was paid. If it belongs to a project invoice, close the invoice. */
export async function onStudioPaymentPaid(db,{paymentId,session=null}){
 const {data:invoice}=await db.from('project_invoices').select('*').eq('studio_payment_id',paymentId).maybeSingle();
 if(!invoice)return {handled:false};
 if(invoice.status==='paid')return {handled:true,duplicate:true};
 if(invoice.status==='void'){
  const {project}=await loadProjectInvoices(db,invoice.project_id);
  const msg=ownerInvoicePaidEmail({project,invoice,ref:invoiceRef(invoice),via:'card (Stripe)',warning:'The customer paid an invoice you had cancelled. Refund it in Stripe if it is not owed.'});
  for(const to of await ownerEmails())await sendEmail({to,...msg,source:'project_invoice_paid_after_void'});
  return {handled:true,warning:'void'};
 }
 return {handled:true,...await finalisePaid(db,{invoice,via:'stripe',session})};
}

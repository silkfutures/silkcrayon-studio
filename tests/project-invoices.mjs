import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import * as rules from '../lib/projectInvoiceRules.js';
const {planInvoice,invoiceSummary,normaliseBank,validateBank,projectInvoiceDocumentModel,quoteTotal}=rules;
const project={id:'11111111-2222-3333-4444-555555555555',title:'EP recording',contact_name:'Sam',email:'sam@example.com',recording_amount_pence:60000,post_amount_pence:20000,quote_revision:2,status:'accepted'};
assert.equal(quoteTotal(project),80000);
let sum=invoiceSummary(project,[]);
assert.deepEqual([sum.total,sum.paid,sum.remaining],[80000,0,80000]);
assert.equal(planInvoice({stage:'deposit',percent:50,summary:sum,title:'EP'}).amount,40000);
assert.equal(planInvoice({stage:'full',summary:sum}).amount,80000);
assert.equal(planInvoice({stage:'balance',summary:sum}).ok,false,'no balance before anything is paid');
assert.equal(planInvoice({stage:'custom',amountPence:90000,summary:sum}).ok,false,'cannot bill more than the quote');
assert.equal(planInvoice({stage:'deposit',percent:2,summary:sum}).ok,false);
sum=invoiceSummary(project,[{status:'paid',amount_pence:40000},{status:'void',amount_pence:5000}]);
assert.equal(sum.remaining,40000);
assert.equal(planInvoice({stage:'balance',summary:sum}).amount,40000);
assert.equal(planInvoice({stage:'deposit',percent:50,summary:sum}).ok,false,'no second deposit once paid');
assert.equal(planInvoice({stage:'balance',summary:invoiceSummary(project,[{status:'paid',amount_pence:40000},{status:'sent',amount_pence:40000}])}).ok,false,'one open invoice at a time');
assert.equal(planInvoice({stage:'full',summary:invoiceSummary({},[])}).ok,false,'needs quote prices');
const bank=normaliseBank({invoice_bank_account_name:'Silkcrayon Ltd',invoice_bank_sort_code:'123456',invoice_bank_account_number:'12345678'});
assert.equal(bank.complete,true);assert.equal(bank.sortCode,'12-34-56');
assert.equal(normaliseBank({}).complete,false);
assert.equal(validateBank({name:'X',sortCode:'12-34-5',accountNumber:'12345678'}).ok,false);
assert.equal(validateBank({name:'',sortCode:'',accountNumber:''}).empty,true);
const inv={id:'abcdef12-0000-0000-0000-000000000000',amount_pence:40000,description:'Deposit (50%) — EP',status:'sent',quote_total_pence:80000,quote_revision:2,due_date:'2026-10-27'};
const model=projectInvoiceDocumentModel(project,inv,{bank,paymentUrl:'https://silkcrayon.com/pay/x'});
assert.equal(model.kind,'invoice');assert.equal(model.due,40000);assert.equal(model.payTo.sortCode,'12-34-56');assert.equal(model.payTo.reference,'SC-P-ABCDEF12');assert.equal(model.rows[0].amount,40000);assert.equal(projectInvoiceDocumentModel(project,{...inv,created_at:'2026-10-20T09:00:00Z'},{bank}).terms,'7 days');assert.equal(projectInvoiceDocumentModel(project,{...inv,created_at:'2026-10-27T09:00:00Z'},{bank}).terms,'Due on receipt');
const paidModel=projectInvoiceDocumentModel(project,{...inv,status:'paid',paid_via:'bank_transfer',paid_at:'2026-10-21T10:00:00Z'},{bank});
assert.equal(paidModel.kind,'receipt');assert.equal(paidModel.due,0);assert.equal(paidModel.paymentUrl,null);assert.equal(paidModel.payTo,null);assert.match(paidModel.sections[0].text,/Paid on 21 October 2026 by bank transfer/);

// ---------- service: fake Supabase + Stripe ----------
function fakeDb(tables){
 let seq=0;
 function query(table){
  const filters=[];let mode='select',patch=null,ins=null,returning=false,orders=[],lim=null;
  const rows=()=>tables[table]||(tables[table]=[]);
  const api={select(){if(mode!=='select')returning=true;return api;},update(p){mode='update';patch=p;return api;},insert(r){mode='insert';ins=Array.isArray(r)?r:[r];return api;},delete(){mode='delete';return api;},upsert(){mode='noop';return api;},
   eq(k,v){filters.push(r=>r[k]===v);return api;},neq(k,v){filters.push(r=>r[k]!==v);return api;},is(k,v){filters.push(r=>(r[k]??null)===v);return api;},in(k,v){filters.push(r=>v.includes(r[k]));return api;},like(){return api;},order(k){orders.push(k);return api;},limit(n){lim=n;return api;},
   run(){
    if(mode==='noop')return {data:null,error:null};
    if(mode==='insert'){const out=ins.map(r=>({id:table==='studio_documents'?++seq:`${table}-${++seq}`,created_at:new Date().toISOString(),...r}));
     if(table==='project_invoices'&&out.some(r=>r.status==='sent'&&rows().some(x=>x.project_id===r.project_id&&x.status==='sent')))return {data:null,error:{code:'23505'}};
     rows().push(...out);return {data:out,error:null};}
    const hit=rows().filter(r=>filters.every(f=>f(r)));
    if(mode==='update'){for(const r of hit)Object.assign(r,patch);return {data:returning?hit.map(r=>({...r})):null,error:null};}
    if(mode==='delete'){tables[table]=rows().filter(r=>!hit.includes(r));return {data:null,error:null};}
    let out=hit.map(r=>table==='project_invoices'?{...r,studio_projects:tables.studio_projects.find(p=>p.id===r.project_id)}:{...r});
    if(lim!=null)out=out.slice(0,lim);return {data:out,error:null};
   },
   maybeSingle(){const r=api.run();return Promise.resolve({data:Array.isArray(r.data)?r.data[0]||null:r.data,error:r.error});},single(){return api.maybeSingle();},then(a,b){return Promise.resolve(api.run()).then(a,b);}};
  return api;
 }
 return {from:query,tables};
}
const emails=[];const sessions=[];
const stripe={checkout:{sessions:{
 create:async p=>{const s={id:`cs_${sessions.length+1}`,url:`https://checkout.stripe.test/${sessions.length+1}`,status:'open',payment_status:'unpaid',...p};sessions.push(s);return s;},
 retrieve:async id=>sessions.find(s=>s.id===id),
 expire:async id=>{const s=sessions.find(x=>x.id===id);s.status='expired';return s;}}}};
const source=readFileSync(new URL('../lib/projectInvoices.js',import.meta.url),'utf8');
const context=vm.createContext({console,Date,process,URL,Buffer});
const mod=new vm.SourceTextModule(source,{context});
const bindings={'node:crypto':{createHash:crypto.createHash},'./customerAuth':{newToken:()=>crypto.randomBytes(24).toString('base64url'),tokenHash:t=>crypto.createHash('sha256').update(t).digest('hex')},'./stripe':{getStripe:()=>stripe},'./notifications':{sendEmail:async m=>{emails.push(m);return {ok:true};},ownerEmails:async()=>['owner@x']},'./documentPdf':{renderDocumentPdf:async()=>Buffer.from('%PDF')},'./projectInvoiceEmails':{projectInvoiceEmail:({payUrl})=>({subject:'invoice',html:payUrl}),projectInvoiceReceiptEmail:()=>({subject:'receipt',html:''}),ownerInvoicePaidEmail:({warning})=>({subject:warning?'warn':'paid',html:''})},'./projectInvoiceRules.js':rules,'./documentNumber.js':await import('../lib/documentNumber.js')};
await mod.link(async name=>{const e=bindings[name];assert.ok(e,`Unexpected import ${name}`);return new vm.SyntheticModule(Object.keys(e),function(){for(const [k,v] of Object.entries(e))this.setExport(k,v);},{context});});
await mod.evaluate();const m=mod.namespace;
const db=fakeDb({studio_projects:[{...project}],project_invoices:[],studio_payments:[],studio_documents:[],studio_settings:[{key:'invoice_bank_account_name',value:'Silkcrayon Ltd'},{key:'invoice_bank_sort_code',value:'123456'},{key:'invoice_bank_account_number',value:'12345678'}]});
const ctx={user:{id:'owner'},profile:{full_name:'Owner',role:'owner'}};
const r1=await m.createProjectInvoice(db,{projectId:project.id,stage:'deposit',percent:50,ctx});
assert.equal(r1.ok,true);assert.equal(r1.emailed,true);assert.equal(r1.bankMissing,false);
const invoice=db.tables.project_invoices[0];
assert.equal(invoice.amount_pence,40000);assert.equal(db.tables.studio_projects[0].status,'deposit_due');
assert.equal((await m.createProjectInvoice(db,{projectId:project.id,stage:'full',ctx})).ok,false,'second open invoice refused');
const token=emails[0].html.split('/pay/')[1];
// Customer opens card checkout twice → reuses the open session, one payment record.
const c1=await m.startCardPayment(db,{token,stripe}),c2=await m.startCardPayment(db,{token,stripe});
assert.equal(c1.ok,true);assert.equal(c2.url,c1.url);assert.equal(db.tables.studio_payments.length,1);assert.equal(sessions[0].metadata.project_invoice_id,invoice.id);
// Customer pays by card, then the owner tries to record a bank transfer → refused, marked paid via card.
sessions[0].payment_status='paid';
const dup=await m.markProjectInvoicePaid(db,{invoiceId:invoice.id,method:'bank_transfer',ctx,stripe});
assert.equal(dup.ok,false);assert.match(dup.error,/already paid this invoice by card/);
assert.equal(invoice.status,'paid');assert.equal(invoice.paid_via,'stripe');assert.equal(db.tables.studio_projects[0].status,'scheduled');
// Webhook arriving afterwards is a no-op.
assert.equal((await m.onStudioPaymentPaid(db,{paymentId:invoice.studio_payment_id})).duplicate,true);
assert.equal((await m.startCardPayment(db,{token,stripe})).paid,true,'paid invoice cannot be paid again');
// Balance by bank transfer: the open checkout is expired first, then recorded once.
const r2=await m.createProjectInvoice(db,{projectId:project.id,stage:'balance',ctx});assert.equal(r2.ok,true);
const bal=db.tables.project_invoices.find(i=>i.id===r2.invoiceId);assert.equal(bal.amount_pence,40000);
const token2=emails.filter(e=>e.subject==='invoice').at(-1).html.split('/pay/')[1];
await m.startCardPayment(db,{token:token2,stripe});
const ok=await m.markProjectInvoicePaid(db,{invoiceId:bal.id,method:'bank_transfer',note:'Monzo',ctx,stripe});
assert.equal(ok.ok,true);assert.equal(sessions.at(-1).status,'expired','open card checkout is closed so they cannot pay twice');
const pay=db.tables.studio_payments.find(p=>p.id===bal.studio_payment_id);assert.equal(pay.status,'paid');assert.equal(pay.payment_method,'bank_transfer');
assert.equal((await m.createProjectInvoice(db,{projectId:project.id,stage:'custom',amountPence:1000,ctx})).ok,false,'fully paid quote');
// Cancelled invoice paid anyway → owner warned, not marked paid.
db.tables.studio_projects[0].recording_amount_pence=100000;
const r3=await m.createProjectInvoice(db,{projectId:project.id,stage:'custom',amountPence:5000,ctx});
const v=db.tables.project_invoices.find(i=>i.id===r3.invoiceId);
const token3=emails.filter(e=>e.subject==='invoice').at(-1).html.split('/pay/')[1];
await m.startCardPayment(db,{token:token3,stripe});
assert.equal((await m.voidProjectInvoice(db,{invoiceId:v.id,stripe})).ok,true);assert.equal(v.status,'void');assert.equal(v.pay_token_hash,null);
assert.equal((await m.onStudioPaymentPaid(db,{paymentId:v.studio_payment_id})).warning,'void');assert.ok(emails.some(e=>e.subject==='warn'));
assert.equal(await m.invoiceByToken(db,token3),null,'cancelled invoice link stops working');
// ---------- continued QuickBooks numbering ----------
{
 const {documentNumber,documentFilename}=await import('../lib/documentNumber.js');
 assert.equal(documentNumber({id:4,kind:'invoice'}),'SC-I-000004');assert.equal(documentNumber({id:4,kind:'invoice',display_number:'1155'}),'1155');
 assert.equal(documentFilename({kind:'invoice',display_number:'1155'}),'Invoice_1155.pdf');assert.equal(documentFilename({kind:'receipt',display_number:'1155'}),'Receipt_1155.pdf');
 let n=1154;
 const db2=fakeDb({studio_projects:[{...project,id:'p2'}],project_invoices:[],studio_payments:[],studio_documents:[],studio_settings:[{key:'invoice_numbering_mode',value:'sequential'}]});
 db2.rpc=async name=>{assert.equal(name,'next_invoice_number');return {data:++n,error:null};};
 const r=await m.createProjectInvoice(db2,{projectId:'p2',stage:'full',ctx});
 const inv2=db2.tables.project_invoices[0];
 assert.equal(inv2.invoice_number,'1155');assert.equal(r.number,'1155');assert.equal(db2.tables.studio_documents[0].display_number,'1155');
 await m.markProjectInvoicePaid(db2,{invoiceId:inv2.id,method:'cash',ctx,stripe});
 assert.equal(db2.tables.studio_documents.find(d=>d.kind==='receipt').display_number,'1155','receipt keeps the invoice number');
 assert.equal(n,1155,'no numbers wasted');
}
console.log('Project invoices: deposit/balance/full planning, bank details, card checkout reuse, no double payment, cancel safety passed');

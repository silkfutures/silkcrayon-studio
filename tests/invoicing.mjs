import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import * as rules from '../lib/invoiceRules.js';
import {receiptRows,receiptNet} from '../lib/receiptRows.js';
import * as numbering from '../lib/documentNumber.js';

// ---------- line rules ----------
assert.equal(rules.normaliseLines([]).ok,false);
let n=rules.normaliseLines([{service:'Studio hire',qty:2.5,rate_pence:5000},{type:'booking',booking_id:'b1',service:'Vocal',qty:1,rate_pence:12000}]);
assert.equal(n.ok,true);assert.equal(n.total,24500);assert.equal(n.lines[0].amount_pence,12500);
assert.equal(rules.normaliseLines([{type:'booking',booking_id:'b1',service:'x',rate_pence:100},{type:'booking',booking_id:'b1',service:'y',rate_pence:100}]).ok,false,'same session twice');
assert.equal(rules.normaliseLines([{service:'x',qty:0,rate_pence:100}]).ok,false);
const plan=rules.accountingPlan(n.lines);assert.equal(plan.customTotal,12500);assert.equal(plan.bookings[0].amount_pence,12000);

// ---------- fake Supabase ----------
function fakeDb(tables){
 let seq=0;
 function query(table){
  const f=[];let mode='select',patch=null,ins=null,ret=false,lim=null;
  const rows=()=>tables[table]||(tables[table]=[]);
  const api={select(){if(mode!=='select')ret=true;return api;},update(p){mode='update';patch=p;return api;},insert(r){mode='insert';ins=Array.isArray(r)?r:[r];return api;},delete(){mode='delete';return api;},
   eq(k,v){f.push(r=>r[k]===v);return api;},neq(k,v){f.push(r=>r[k]!==v);return api;},is(k,v){f.push(r=>(r[k]??null)===v);return api;},in(k,v){f.push(r=>v.includes(r[k]));return api;},
   not(k,op,v){if(op==='is')f.push(r=>(r[k]??null)!==v);else if(op==='in'){const list=String(v).replace(/[()]/g,'').split(',');f.push(r=>!list.includes(r[k]));}return api;},
   order(){return api;},limit(x){lim=x;return api;},like(){return api;},
   run(){
    if(mode==='insert'){const out=ins.map(r=>({id:table==='studio_documents'?++seq:`${table}-${++seq}`,created_at:new Date().toISOString(),...r}));rows().push(...out);return {data:out,error:null};}
    const hit=rows().filter(r=>f.every(x=>x(r)));
    if(mode==='update'){for(const r of hit)Object.assign(r,patch);return {data:ret?hit.map(r=>({...r})):null,error:null};}
    if(mode==='delete'){tables[table]=rows().filter(r=>!hit.includes(r));return {data:null,error:null};}
    return {data:(lim?hit.slice(0,lim):hit).map(r=>({...r})),error:null};
   },
   maybeSingle(){const r=api.run();return Promise.resolve({data:Array.isArray(r.data)?r.data[0]||null:r.data,error:r.error});},single(){return api.maybeSingle();},then(a,b){return Promise.resolve(api.run()).then(a,b);}};
  return api;
 }
 return {from:query,tables,rpc:async()=>({data:++tables.__n,error:null})};
}
const emails=[],sessions=[];
const stripe={checkout:{sessions:{create:async p=>{const s={id:`cs_${sessions.length+1}`,url:`https://pay.test/${sessions.length+1}`,status:'open',payment_status:'unpaid',payment_intent:null,...p};sessions.push(s);return s;},retrieve:async id=>sessions.find(s=>s.id===id),expire:async id=>{sessions.find(s=>s.id===id).status='expired';}}}};
const source=readFileSync(new URL('../lib/invoices.js',import.meta.url),'utf8');
const context=vm.createContext({console,Date,process,URL,Buffer,Intl});
const mod=new vm.SourceTextModule(source,{context});
const bindings={'node:crypto':{createHash:crypto.createHash},'./customerAuth':{newToken:()=>crypto.randomBytes(24).toString('base64url'),tokenHash:t=>crypto.createHash('sha256').update(t).digest('hex')},'./stripe':{getStripe:()=>stripe},'./notifications':{sendEmail:async m=>{emails.push(m);return {ok:true};},ownerEmails:async()=>['o@x']},'./documentPdf':{renderDocumentPdf:async()=>Buffer.from('%PDF')},'./projectInvoiceEmails':{projectInvoiceEmail:({payUrl})=>({subject:'invoice',html:payUrl}),projectInvoiceReceiptEmail:()=>({subject:'receipt',html:''}),ownerInvoicePaidEmail:({warning})=>({subject:warning?'warn':'paid',html:''})},'./projectInvoices':{getInvoiceBank:async()=>({complete:true,name:'Silkcrayon Ltd',sortCode:'04-00-04',accountNumber:'12345678',termsDays:7})},'./documentNumber.js':numbering,'./invoiceRules.js':rules};
await mod.link(async name=>{const e=bindings[name];assert.ok(e,`Unexpected import ${name}`);return new vm.SyntheticModule(Object.keys(e),function(){for(const [k,v] of Object.entries(e))this.setExport(k,v);},{context});});
await mod.evaluate();const m=mod.namespace;
const ctx={user:{id:'owner'},profile:{full_name:'Owner',role:'owner'}};
function fresh(){return fakeDb({__n:1154,customers:[{id:'c1',full_name:'Sam',email:'sam@x.com'}],
 bookings:[{id:'b1',customer_id:'c1',booking_date:'2026-10-01',start_time:'10:00',end_time:'13:00',duration_minutes:180,service_name:'Vocal recording',amount_pence:15000,amount_paid_pence:0,payment_status:'unpaid',payment_method:'bank_transfer',status:'completed',project_id:null,invoice_id:null,created_at:'2026-09-20T10:00:00Z'},
  {id:'b2',customer_id:'c1',booking_date:'2026-10-02',start_time:'10:00',end_time:'12:00',duration_minutes:120,service_name:'Vocal recording',amount_pence:10000,amount_paid_pence:0,payment_status:'paid',payment_method:'stripe',status:'completed',project_id:null,invoice_id:null}],
 session_reports:[{id:'r1',customer_id:'c1',booking_id:null,session_date:'2026-10-05',actual_hours:2,invoice_id:null}],
 studio_payments:[],invoices:[],studio_documents:[],studio_settings:[{key:'invoice_numbering_mode',value:'sequential'}]});}
const input={customerId:'c1',billToName:'Sam',billToEmail:'sam@x.com',dueDate:'2026-10-27',lines:[
 {type:'booking',booking_id:'b1',date:'2026-10-01',service:'Vocal recording',qty:1,rate_pence:15000},
 {type:'session',session_report_id:'r1',hours:2,date:'2026-10-05',service:'Studio session',qty:2,rate_pence:5000},
 {type:'custom',service:'Mix',description:'Rough mix',qty:1,rate_pence:4000}]};

// ---------- billable, locking, sending ----------
let db=fresh();
let bill=await m.billableForCustomer(db,'c1');
assert.deepEqual(bill.bookings.map(b=>b.id),['b1'],'paid sessions are not billable');assert.equal(bill.sessions.length,1);
const d=await m.saveDraft(db,{input,ctx});assert.equal(d.ok,true);
assert.equal(db.tables.bookings[0].invoice_id,d.invoice.id);assert.equal(d.invoice.total_pence,29000);
assert.equal((await m.saveDraft(db,{input,ctx})).ok,false,'the same session can’t go on a second invoice');
bill=await m.billableForCustomer(db,'c1');assert.equal(bill.bookings.length+bill.sessions.length,0,'locked sessions disappear from the picker');
const sent=await m.sendInvoice(db,{id:d.invoice.id});
assert.equal(sent.ok,true);assert.equal(sent.number,'1155');assert.equal(db.tables.invoices[0].status,'sent');assert.equal(db.tables.studio_documents[0].display_number,'1155');
assert.equal(db.tables.studio_payments.length,0,'nothing is counted as revenue until it is paid');

// ---------- paid by bank transfer → Accounting shows it exactly once ----------
const before=receiptNet(receiptRows(db.tables.bookings,db.tables.studio_payments,[]));
const paid=await m.markInvoicePaid(db,{id:d.invoice.id,method:'bank_transfer',note:'Monzo',ctx,stripe});
assert.equal(paid.ok,true);
const b1=db.tables.bookings.find(b=>b.id==='b1');assert.equal(b1.payment_status,'paid');assert.equal(b1.amount_paid_pence,15000);assert.ok(b1.paid_at);
const pays=db.tables.studio_payments;assert.equal(pays.length,2);
assert.equal(pays.find(p=>p.session_report_id==='r1').session_hours,2,'logged session keeps its hours');
const after=receiptNet(receiptRows(db.tables.bookings,db.tables.studio_payments,[]));
assert.equal(after-before,29000,'Accounting goes up by exactly the invoice total');
assert.equal((await m.markInvoicePaid(db,{id:d.invoice.id,method:'cash',ctx,stripe})).ok,false,'cannot be paid twice');
assert.ok(emails.some(e=>e.subject==='receipt'));

// ---------- paid by card (webhook, delivered twice) ----------
db=fresh();emails.length=0;
const d2=await m.saveDraft(db,{input,ctx});await m.sendInvoice(db,{id:d2.invoice.id});
const token=emails.find(e=>e.subject==='invoice').html.split('/pay/')[1];
const c1=await m.startGeneralCardPayment(db,{token,stripe}),c2=await m.startGeneralCardPayment(db,{token,stripe});
assert.equal(c1.ok,true);assert.equal(c2.url,c1.url,'one checkout');assert.equal(sessions.at(-1).metadata.invoice_id,d2.invoice.id);assert.equal(sessions.at(-1).line_items[0].price_data.unit_amount,29000);
const s0=receiptNet(receiptRows(db.tables.bookings,db.tables.studio_payments,[]));
const sess={...sessions.at(-1),payment_status:'paid',payment_intent:'pi_123'};
await m.onInvoiceCheckoutPaid(db,sess);await m.onInvoiceCheckoutPaid(db,sess);
assert.equal(db.tables.invoices[0].status,'paid');assert.equal(db.tables.invoices[0].paid_via,'stripe');
assert.equal(receiptNet(receiptRows(db.tables.bookings,db.tables.studio_payments,[]))-s0,29000,'card payment counted once even if Stripe sends the webhook twice');
assert.equal(db.tables.studio_payments.every(p=>p.stripe_payment_intent_id==='pi_123'),true);
assert.equal((await m.startGeneralCardPayment(db,{token,stripe})).paid,true);

// ---------- bank transfer recorded while customer had already paid by card ----------
db=fresh();emails.length=0;
const d3=await m.saveDraft(db,{input,ctx});await m.sendInvoice(db,{id:d3.invoice.id});
const t3=emails.find(e=>e.subject==='invoice').html.split('/pay/')[1];await m.startGeneralCardPayment(db,{token:t3,stripe});
sessions.at(-1).payment_status='paid';sessions.at(-1).payment_intent='pi_9';
const r3=await m.markInvoicePaid(db,{id:d3.invoice.id,method:'bank_transfer',ctx,stripe});
assert.equal(r3.ok,false);assert.match(r3.error,/already paid this invoice by card/);assert.equal(db.tables.invoices[0].paid_via,'stripe');
assert.equal(receiptNet(receiptRows(db.tables.bookings,db.tables.studio_payments,[])),29000+10000,'only the card payment is recorded (plus the already-paid b2)');

// ---------- cancel releases the sessions ----------
db=fresh();emails.length=0;
const d4=await m.saveDraft(db,{input,ctx});await m.sendInvoice(db,{id:d4.invoice.id});
assert.equal((await m.voidInvoice(db,{id:d4.invoice.id,stripe})).ok,true);
assert.equal(db.tables.bookings[0].invoice_id,null);assert.equal(db.tables.invoices[0].pay_token_hash,null);
assert.equal((await m.billableForCustomer(db,'c1')).bookings.length,1,'cancelled invoice frees its sessions');
assert.equal(db.tables.studio_payments.length,0);
// drafts: delete frees too; non-artist invoices can't include sessions
const d5=await m.saveDraft(db,{input,ctx});assert.equal((await m.deleteDraft(db,{id:d5.invoice.id})).ok,true);assert.equal(db.tables.bookings[0].invoice_id,null);
assert.equal((await m.saveDraft(db,{input:{...input,customerId:null},ctx})).ok,false);
const org=await m.saveDraft(db,{input:{billToName:'ACT Training',billToEmail:'finance@act.org',lines:[{service:'Mentoring',description:'6 × 1.5h sessions',qty:1,rate_pence:90000}]},ctx});assert.equal(org.ok,true);
// ---------- companies ----------
{
 const co=await import('../lib/companies.js');
 assert.equal(co.cleanCompany({name:''}).ok,false);assert.equal(co.cleanCompany({name:'ACT',email:'bad'}).ok,false);
 assert.deepEqual(co.billToFromCompany({name:'ACT Training',contact_name:'Finance team',email:'f@act.org',address:'Ocean Park House\nCardiff CF24 5ET'}),{name:'ACT Training',email:'f@act.org',address:'FAO Finance team\nOcean Park House\nCardiff CF24 5ET'});
 const db=fresh();db.tables.billing_contacts=[{id:'co1',name:'Silkfutures',email:'pay@silkfutures.org',address:'Cardiff'}];
 const r=await m.saveDraft(db,{input:{...input,billingContactId:'co1',billToName:'Silkfutures',billToEmail:'pay@silkfutures.org'},ctx});
 assert.equal(r.ok,true);assert.equal(r.invoice.billing_contact_id,'co1');assert.equal(r.invoice.customer_id,'c1','company pays for the artist’s sessions');
 assert.equal(db.tables.bookings[0].invoice_id,r.invoice.id);
 await m.sendInvoice(db,{id:r.invoice.id});await m.markInvoicePaid(db,{id:r.invoice.id,method:'bank_transfer',ctx,stripe});
 assert.equal(db.tables.bookings[0].payment_status,'paid','artist’s session marked paid when the company pays');
 assert.equal((await m.saveDraft(db,{input:{...input,billingContactId:'gone'},ctx})).ok,false);
}
console.log('Invoicing: past sessions + custom lines, locking, numbering, bank/card payment counted once in Accounting, cancel/delete release passed');

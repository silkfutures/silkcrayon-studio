import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {canAccessDocumentSource} from '../lib/documentModel.js';
let staff=null,customer=null,record={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',customer_id:'c1',engineer_user_id:'e1',customers:{id:'c1',email:'real@example.com'}},sent=[],sends=[],generated=0;
const doc={id:1,kind:'invoice',number:'SC-I-000001',created_at:'2026-10-20',snapshot:{kind:'invoice'}};
const db={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},async maybeSingle(){return {data:table==='studio_documents'?(String(filters.id)==='1'?{...doc,source_type:'booking',source_id:record.id}:null):record}},then(resolve){return Promise.resolve({data:table==='project_quote_emails'?sent:[]}).then(resolve)}};return q;}};
const bindings={'next/server':{NextResponse:{json:(data,opts={})=>({data,status:opts.status||200})}},auth:{getStaffContext:async()=>staff},customerAuth:{getCustomerContext:async()=>customer?{customer}:null},supabase:{getAdminDb:()=>db},documentModel:{canAccessDocumentSource},documents:{ensureDocument:async()=>{generated++;return doc}},documentPdf:{renderDocumentPdf:async()=>Buffer.from('%PDF')},notifications:{sendEmail:async args=>{sends.push(args);return {ok:true}}}};
const context=vm.createContext({console,URL,Response,Buffer});const mod=new vm.SourceTextModule(readFileSync(new URL('../app/api/documents/[source]/[id]/route.js',import.meta.url),'utf8'),{context});
await mod.link(async spec=>{const values=bindings[spec]||bindings[spec.split('/').at(-1)];if(!values)throw Error(spec);const m=new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v)},{context});await m.link(()=>{});await m.evaluate();return m;});await mod.evaluate();
const req=(query='',origin='https://studio.test')=>({url:'https://studio.test/api/documents/booking/'+record.id+query,headers:new Headers({origin})});
const params=source=>({params:Promise.resolve({source,id:record.id})});
assert.equal((await mod.namespace.GET(req(),params('booking'))).status,401);assert.equal(generated,0);
staff={user:{id:'e2'},profile:{role:'engineer'}};assert.equal((await mod.namespace.GET(req(),params('booking'))).status,404);assert.equal(generated,0);
staff=null;customer={id:'c2',email:'wrong@example.com'};assert.equal((await mod.namespace.GET(req(),params('booking'))).status,404);
customer={id:'c1',email:'real@example.com'};const response=await mod.namespace.GET(req(),params('booking'));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await mod.namespace.POST(req(),params('booking'))).status,403);
staff={user:{id:'e1'},profile:{role:'engineer'}};customer=null;assert.equal((await mod.namespace.POST(req('','https://evil.test'),params('booking'))).status,403);assert.equal(sends.length,0);assert.equal((await mod.namespace.POST(req(),params('booking'))).status,200);assert.equal(sends[0].to,'real@example.com');assert.equal(sends[0].attachments.length,1);
staff=null;customer={id:'c1',email:'real@example.com'};record={...record,email:'real@example.com'};
assert.equal((await mod.namespace.GET(req(),params('project'))).status,404); // Unsent owner draft is not a customer quote.
sent=[{pdf_document_id:1,snapshot:record,revision:1}];assert.equal((await mod.namespace.GET(req('?version=2'),params('project'))).status,404);
console.log('Actual PDF routes: anonymous, cross-customer, engineer scope, CSRF, recipient protection and unsent drafts passed.');
// Exercise the real email transport with an in-memory provider, never a live send.
let payload=null,activity=null;
const mailContext=vm.createContext({console,process:{env:{RESEND_API_KEY:'test-only'}},fetch:async(url,opts)=>{payload=JSON.parse(opts.body);return {ok:true,json:async()=>({id:'mock-email'})}}});
const mail=new vm.SourceTextModule(readFileSync(new URL('../lib/notifications.js',import.meta.url),'utf8'),{context:mailContext});
await mail.link(async spec=>{const values=spec.includes('messageActivity')?{deliverWithActivity:async(meta,deliver)=>{activity=meta;return deliver()}}:{getAdminDb:()=>{throw Error('Unexpected database access')}};const m=new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context:mailContext});await m.link(()=>{});await m.evaluate();return m;});await mail.evaluate();
const attachment={filename:'SC-I-000001.pdf',content:Buffer.from('%PDF-test').toString('base64'),content_type:'application/pdf'};
const mailed=await mail.namespace.sendEmail({to:'example@example.com',subject:'Invoice',html:'<p>Your PDF</p>',attachments:[attachment],source:'PDF invoice'});
assert.equal(mailed.ok,true);assert.deepEqual(JSON.parse(JSON.stringify(payload.attachments)),[attachment]);assert.equal(activity.source,'PDF invoice');console.log('PDF attachment reaches the email provider through the existing activity log.');

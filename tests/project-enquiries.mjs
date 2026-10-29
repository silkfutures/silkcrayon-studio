import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEAD_STATUSES,LEAD_STATUS_KEYS,normaliseLeadStatus,leadStatusLabel,isProjectEnquiry} from '../lib/leadPipeline.js';

// --- pipeline shape -------------------------------------------------------
assert.deepEqual(LEAD_STATUS_KEYS,['new','discussing','quote_sent','confirmed','lost']);
assert.equal(LEAD_STATUSES.length,5);

// 'interested' predates the pipeline and must keep working, not reset to new.
assert.equal(normaliseLeadStatus('interested'),'discussing');
assert.equal(leadStatusLabel('interested'),'Discussing');
assert.equal(normaliseLeadStatus('new'),'new');
assert.equal(normaliseLeadStatus('quote_sent'),'quote_sent');
assert.equal(normaliseLeadStatus(null),'new');
assert.equal(normaliseLeadStatus('something_else'),'new');
assert.equal(leadStatusLabel('confirmed'),'Confirmed');

// --- which enquiries get the project treatment ---------------------------
assert(isProjectEnquiry({enquiry_type:'project'}));
assert(isProjectEnquiry({enquiry_type:'bespoke-production'}));
for(const t of ['production','mixing','podcast-recording','call-request','general',undefined])assert(!isProjectEnquiry({enquiry_type:t}),`${t} must stay a simple enquiry`);

// --- PATCH /api/admin/leads/[id] -----------------------------------------
// Loaded the way the other suites load route handlers: strip imports, inject deps.
const source=fs.readFileSync(new URL('../app/api/admin/leads/[id]/route.js',import.meta.url),'utf8')
 .replace(/^import .*;\n/gm,'')
 .replace(/export async function/g,'async function');
const NextResponse={json:(body,{status=200}={})=>({body,status})};
let updated=null,failNext=null;
const db={from(){return{
 update(patch){updated=patch;return this},
 eq(){return this},
 select(){return this},
 async single(){return failNext?{data:null,error:{message:failNext}}:{data:{id:'lead-1',status:updated?.status,notes:updated?.notes},error:null}}
}}};
const requireOwner=async()=>({profile:{role:'owner'}});
const getAdminDb=()=>db;
const {PATCH}=new Function('NextResponse','requireOwner','getAdminDb','LEAD_STATUSES',
 source+';return {PATCH}')(NextResponse,requireOwner,getAdminDb,LEAD_STATUSES);
const call=body=>PATCH({json:async()=>body},{params:Promise.resolve({id:'lead-1'})});

for(const status of LEAD_STATUS_KEYS){
 const r=await call({status});
 assert.equal(r.status,200,`${status} should be accepted`);
 assert.equal(updated.status,status);
 assert(updated.updated_at,'updated_at must be stamped');
}

// Unknown statuses are refused rather than written through.
updated=null;
const bad=await call({status:'archived'});
assert.equal(bad.status,400);
assert.match(bad.body.error,/Unknown enquiry status/);
assert.equal(updated,null,'a rejected status must not reach the database');

// An empty patch is refused, so a stray call cannot blank a row.
assert.equal((await call({})).status,400);

// Notes are bounded.
assert.equal((await call({notes:'x'.repeat(4001)})).status,400);
assert.equal((await call({notes:'Spoke on the phone, sending a quote.'})).status,200);

// Database failures surface as 500 rather than a false success.
failNext='connection reset';
assert.equal((await call({status:'confirmed'})).status,500);
failNext=null;

console.log('project-enquiries: all assertions passed');

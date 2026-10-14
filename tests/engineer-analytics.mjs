import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {loadPageViews,analyticsWindow} from '../lib/analyticsData.js';
import {generateSlots} from '../lib/availability.js';
import {escapeHtml} from '../lib/escapeHtml.js';
import {londonDateTimeToUtc} from '../lib/time.js';
// More than one database result page must include the newest records.
let pageCalls=[];
const pageDb={from(){return {select(){return this},gte(){return this},neq(){return this},order(){return this},async range(a,b){pageCalls.push(a);return {data:Array.from({length:a<1000?500:7},(_,i)=>({id:a+i})),error:null};}};}};
assert.equal((await loadPageViews(pageDb,'2026-10-01')).at(-1).id,1006);
assert.deepEqual(pageCalls,[0,500,1000]);
const badDb={from(){return {select(){return this},gte(){return this},neq(){return this},order(){return this},async range(){return {error:new Error('offline')};}};}};
await assert.rejects(()=>loadPageViews(badDb,'2026-10-01'),/offline/);
assert.deepEqual(analyticsWindow(7,'2026-10-14'),{today:'2026-10-14',since:'2026-10-08',sinceIso:'2026-10-07T23:00:00.000Z'});
assert.equal(analyticsWindow(7,'2026-10-29').sinceIso,'2026-10-22T23:00:00.000Z');
// Execute actual route handlers against controlled auth, database and providers.
async function loadRoute(file,bindings){
 const context=vm.createContext({console,process,Date,URL,URLSearchParams});
 const modules=new Map();
 const dependency=async spec=>{if(modules.has(spec))return modules.get(spec);let values=bindings[spec]||bindings[spec.split('/').at(-1)];if(!values)throw new Error(`Missing test dependency ${spec}`);const mod=new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});modules.set(spec,mod);await mod.link(()=>{});await mod.evaluate();return mod;};
 const mod=new vm.SourceTextModule(await fs.readFile(new URL(file,import.meta.url),'utf8'),{context,importModuleDynamically:dependency});await mod.link(dependency);await mod.evaluate();return mod.namespace;
}
let ctx={user:{id:'billy'},profile:{role:'engineer',full_name:'Billy'}},writes=0,conflict=false,queryError=false,emails=[],assignmentArgs=[];
let booking={id:'session',engineer_user_id:'billy',assigned_engineer:'Billy',status:'confirmed',booking_date:'2026-12-14',start_time:'10:00',end_time:'12:00',duration_minutes:120,service_slug:'vocal-recording',service_name:'Recording',updated_at:'2026-10-14T12:00:00Z',internal_notes:'private',customers:{id:'artist',artist_name:'A < B',email:'artist@example.com',phone:'07000000000'}};
const db={from(table){let patch=null,filters={},select='';const q={select(s){select=s;return q},eq(k,v){filters[k]=v;return q},in(){return q},update(p){patch=p;return q},async single(){if(table==='staff_profiles')return {data:{user_id:'other',role:'engineer',active:true,full_name:'Other'}};if(patch){writes++;booking={...booking,...patch};}return {data:{...booking},error:null}},then(resolve){if(patch){writes++;booking={...booking,...patch};return Promise.resolve({data:booking}).then(resolve);}return Promise.resolve({data:[],error:queryError?new Error('database unavailable'):null}).then(resolve)}};return q;},async rpc(name,args){assert.equal(name,'staff_reschedule_booking_locked');assert.equal(args.p_actor_id,ctx.user.id);if(conflict)return {error:{message:'slot_unavailable'}};writes++;booking={...booking,booking_date:args.p_date,start_time:args.p_start,end_time:'14:00'};return {error:null};}};
const response={json:(data,options={})=>({status:options.status||200,data})};
const bindings={'next/server':{NextResponse:response},supabase:{getAdminDb:()=>db},auth:{getStaffContext:async()=>ctx},notifications:{engineerAssignedEmail:()=>({subject:'assigned',html:'assigned'}),sendStaffLoggedNotification:async a=>{assignmentArgs.push(a);return {ok:false,error:'provider offline'};},staffEmail:async()=> 'engineer@example.com',sendEmail:async a=>{emails.push(a);return {ok:false,error:'provider offline'};}},stripe:{getStripe:()=>{}},bookingEvents:{recordBookingEvent:async()=>{}},dates:{formatUkDate:v=>v},sms:{sendSms:async()=>({ok:true})},escapeHtml:{escapeHtml},dryHireId:{closeDryHireIdCheck:async()=>{}},availability:{generateSlots}};
const {PATCH}=await loadRoute('../app/api/admin/bookings/[id]/route.js',bindings);
const patch=body=>PATCH({json:async()=>body},{params:Promise.resolve({id:'session'})});
for(const body of [{status:'cancelled'},{engineerUserId:'other'},{manualPaymentStatus:'paid'},{ownerReschedule:{date:'2026-12-15',start:'12:00'},refund:true}])assert.equal((await patch(body)).status,403);
assert.equal(writes,0);
booking.engineer_user_id='other';assert.equal((await patch({ownerReschedule:{date:'2026-12-15',start:'12:00'}})).status,403);
booking.engineer_user_id=null;assert.equal((await patch({ownerReschedule:{date:'2026-12-15',start:'12:00'}})).status,403);
booking.engineer_user_id='billy';conflict=true;assert.equal((await patch({ownerReschedule:{date:'2026-12-15',start:'12:00'}})).status,409);assert.equal(emails.length,0);
conflict=false;queryError=true;assert.equal((await patch({ownerReschedule:{date:'2026-12-15',start:'12:00'}})).status,500);assert.equal(writes,0);queryError=false;
const moved=await patch({ownerReschedule:{date:'2026-12-15',start:'12:00',note:'<img src=x>'}});
assert.equal(moved.status,200);assert.equal(moved.data.notifications.email.ok,false);assert.equal(moved.data.notifications.sms.ok,true);assert.equal(moved.data.booking.internal_notes,undefined);assert.equal(emails.length,2);assert.match(emails[0].html,/&lt;img src=x&gt;/);assert.ok(!emails[0].html.includes('<img src=x>'));
ctx={user:{id:'owner'},profile:{role:'owner'}};const assigned=await patch({engineerUserId:'other'});assert.equal(assigned.status,200);assert.equal(assigned.data.notification.ok,false);assert.equal(assignmentArgs.at(-1).force,true);
// Engineer booking accepts real date, email and time; fails before writes on invalid input.
ctx={user:{id:'billy'},profile:{role:'engineer'}};
let reachedCustomerLookup=false;
const route=await loadRoute('../app/api/engineer/bookings/route.js',{...bindings,time:{londonDateTimeToUtc},supabase:{getAdminDb:()=>({from:()=>{reachedCustomerLookup=true;throw new Error('VALIDATION_PASSED')}})}});
const request={date:'2027-01-15',start:'18:00',hours:2,email:'artist@example.com',customerTermsConfirmed:true};
let result=await route.POST({json:async()=>request});assert.equal(result.status,500);assert.equal(reachedCustomerLookup,true);
result=await route.POST({json:async()=>({...request,start:'25:00'})});assert.equal(result.status,400);
// Every offered duration reaches booking creation; invalid lengths and closing-time overruns fail early.
for(const hours of [1,2,3,4,5,6,7,8]){
 reachedCustomerLookup=false;
 const accepted=await route.POST({json:async()=>({...request,start:'10:00',hours})});
 assert.equal(accepted.status,500);assert.equal(reachedCustomerLookup,true);
}
for(const input of [{hours:0},{hours:9},{hours:2.5},{hours:8,start:'13:30'}]){
 reachedCustomerLookup=false;
 const rejected=await route.POST({json:async()=>({...request,start:'10:00',...input})});
 assert.equal(rejected.status,400);assert.equal(reachedCustomerLookup,false);
}
// Collector must not report success on database failure, or an unavailable rate limiter.
let insertFails=true,limitFails=false;
const collector=await loadRoute('../app/api/analytics/route.js',{'next/server':{NextResponse:response},rateLimit:{rateLimit:async()=>{if(limitFails)throw new Error('limiter missing');return true;}},supabase:{getAdminDb:()=>({from:()=>({insert:async()=>({error:insertFails?new Error('write failed'):null})})})}});
const visit={json:async()=>({path:'/booking',visitorId:'visitor'})};assert.equal((await collector.POST(visit)).status,503);insertFails=false;assert.equal((await collector.POST(visit)).status,200);limitFails=true;assert.equal((await collector.POST(visit)).status,503);
console.log('Engineer authorization, rescheduling, notification failures, validation and analytics pagination/write-error tests passed.');
const {quoteFields,quoteLines,templateForLead}=await import('../lib/quoteTemplates.js');
const {projectQuoteEmail}=await import('../lib/projectQuoteEmail.js');
for(const key of ['music','voiceover','dry_hire','podcast'])assert.ok(quoteFields(key).quote_handover);
assert.equal(templateForLead({enquiry_type:'dry-hire'}),'dry_hire');
const quoteProject={id:'quote1',title:'Test <script>',contact_name:'A & B',email:'test@example.com',quote_revision:1,recording_hours_included:2,audio_recording_amount_pence:10000,audio_post_amount_pence:5000,...quoteFields('music')};
assert.equal(quoteLines(quoteProject).reduce((n,l)=>n+l.pence,0),15000);
const quoteEmail=projectQuoteEmail(quoteProject);assert.match(quoteEmail.html,/£150.00/);assert.match(quoteEmail.html,/Test &lt;script&gt;/);assert.match(quoteEmail.html,/Files & handover/);assert.ok(!quoteEmail.html.includes('<script>'));
let quoteSends=0,quoteLog=null;
const quoteDb={from(table){let action='select',payload=null,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},insert(p){action='insert';payload=p;return q},update(p){action='update';payload=p;return q},async single(){if(table==='studio_projects')return {data:quoteProject};if(action==='insert'){if(quoteLog)return {error:{code:'23505'}};quoteLog={id:'log',...payload};return {data:quoteLog};}return {data:quoteLog};},async maybeSingle(){if(filters.status&&quoteLog.status!==filters.status)return {data:null};quoteLog={...quoteLog,...payload};return {data:quoteLog};},then(resolve){quoteLog={...quoteLog,...payload};return Promise.resolve({error:null}).then(resolve)}};return q;}};
ctx={user:{id:'billy'},profile:{role:'engineer'}};
const quotes=await loadRoute('../app/api/admin/projects/[id]/quote/route.js',{'next/server':{NextResponse:response},auth:{getStaffContext:async()=>ctx},supabase:{getAdminDb:()=>quoteDb},notifications:{sendEmail:async()=>{quoteSends++;return {ok:true,id:'provider'};}},projectQuoteEmail:{projectQuoteEmail},quoteTemplates:{quoteLines}});
const sendQuote=revision=>quotes.POST({json:async()=>({revision})},{params:Promise.resolve({id:'quote1'})});
assert.equal((await sendQuote(1)).status,403);assert.equal(quoteSends,0);
ctx={user:{id:'owner'},profile:{role:'owner'}};assert.equal((await sendQuote(2)).status,409);assert.equal(quoteSends,0);
assert.equal((await sendQuote(1)).status,200);assert.equal(quoteSends,1);assert.equal(quoteLog.status,'sent');
assert.equal((await sendQuote(1)).data.duplicate,true);assert.equal(quoteSends,1);
console.log('Quote templates, totals, escaping, owner authorization, stale version and duplicate-send tests passed.');

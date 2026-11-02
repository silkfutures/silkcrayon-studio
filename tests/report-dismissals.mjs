import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {dismissedReportIds} from '../lib/reportDismissals.js';
import {needsSessionReport} from '../lib/unresolvedSessions.js';
const events=[{booking_id:'a',event_type:'report_dismissed',created_at:'2026-01-01'},{booking_id:'a',event_type:'report_restored',created_at:'2026-01-02'},{booking_id:'b',event_type:'report_dismissed',created_at:'2026-01-01'}];
assert.deepEqual([...dismissedReportIds(events)],['b']);
const source=await readFile(new URL('../app/api/admin/bookings/[id]/report-task/route.js',import.meta.url),'utf8');
async function run({role='owner',action='dismiss',reports=[],fail=false,origin='https://example.com'}={}){
 const writes=[],booking={id:'b',customer_id:'c',booking_date:'2020-01-01',start_time:'10:00',duration_minutes:60,status:'confirmed',payment_status:'paid',session_reports:reports};
 const db={from(table){assert(['bookings','booking_events'].includes(table));const chain={select(){return chain},eq(){return chain},maybeSingle:async()=>({data:booking}),insert:async row=>{assert.equal(table,'booking_events');writes.push(row);return {error:fail?new Error('Save failed'):null}}};return chain}};
 const post=vm.runInNewContext(source.replace(/^import .*;\n/gm,'').replace('export async function POST','async function POST')+'\nPOST',{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})},getStaffContext:async()=>({profile:{role,full_name:'Owner'},user:{id:'u'}}),getAdminDb:()=>db,needsSessionReport,londonToday:()=> '2026-11-02',URL});
 const result=await post({url:'https://example.com/api',headers:{get:()=>origin},json:async()=>({action})},{params:Promise.resolve({id:'b'})});return {result,writes,booking};
}
for(const action of ['dismiss','restore']){const r=await run({action});assert.equal(r.result.status,200);assert.equal(r.writes[0].event_type,action==='dismiss'?'report_dismissed':'report_restored');assert.equal(r.booking.status,'confirmed');assert.equal(r.booking.payment_status,'paid');}
for(const options of [{role:'engineer'},{action:'delete'},{reports:[{id:'report'}]},{origin:'https://other.example'}]){const r=await run(options);assert(r.result.status>=400);assert.equal(r.writes.length,0);}
assert.equal((await run({fail:true})).result.status,500);
console.log('Report dismissal/restore, owner access, origin, completed-report guard, write failure and preserved booking/payment tests passed.');

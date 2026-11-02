import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {hasSessionStarted,wasRecordedAfterStart,pastSessionEmail} from '../lib/pastBookings.js';
import {londonDateTimeToUtc,londonDateOffset} from '../lib/time.js';
const source=await readFile(new URL('../app/api/admin/bookings/manual/route.js',import.meta.url),'utf8');
async function run(date,{confirmed=true,mode='pay_by_bank',role='owner'}={}){
 const events=[],customer={id:'customer',email:'test@example.com',phone:'07000000000',full_name:'Test Artist'},engineer={user_id:'engineer',active:true,full_name:'Engineer'};
 let booking={id:'booking',booking_date:date,start_time:'10:00',end_time:'12:00',service_name:'Vocal Recording',customers:customer};
 const db={rpc:async()=>{events.push('reserve');return {data:'booking'};},from(table){let op='select',payload;const chain={select(){return chain},eq(){return chain},in(){return chain},update(p){op='update';payload=p;return chain},insert(p){op='insert';payload=p;return chain},single(){return chain},maybeSingle(){return chain},then(resolve,reject){if(table==='bookings'&&op==='update')booking={...booking,...payload};const data=table==='customers'?customer:table==='staff_profiles'?engineer:table==='bookings'?booking:table==='studio_payments'?{id:'payment'}:null;return Promise.resolve({data,count:1,error:null}).then(resolve,reject)}};return chain}};
 const ctx={NextResponse:{json:(body,options)=>({body,status:options?.status||200})},getStaffContext:async()=>({profile:{role,full_name:'Owner'},user:{id:'owner'}}),getAdminDb:()=>db,hasSessionStarted,pastSessionEmail,londonDateTimeToUtc,londonDateOffset,formatUkDate:x=>x,newToken:()=> 'token',tokenHash:()=> 'hash',confirmationEmail:()=>({subject:'future confirmation',html:'future'}),sendLoggedNotification:async x=>events.push(x.type),sendLoggedSms:async x=>events.push(x.type),notifyAssignedEngineer:async()=>{events.push('assignment');return {ok:true}},ensureDryHireIdRequest:async()=>events.push('id'),recordBookingEvent:async()=>{},ensureCallPrep:async()=>events.push('prep'),after:fn=>fn(),getStripe:()=>({checkout:{sessions:{create:async()=>{events.push('payment-link');return {id:'checkout',url:'https://example.com/pay'}}}}}),process:{env:{}},URL,console};
 const post=vm.runInNewContext(source.replace(/^import .*;\n/gm,'').replace('export async function POST','async function POST')+'\nPOST',ctx);
 const result=await post({url:'https://example.com/api',json:async()=>({customerId:'customer',date,start:'10:00',end:'12:00',hours:2,amount:100,engineerUserId:'engineer',paymentMode:mode,pastSessionConfirmed:confirmed})});
 return {result,events,booking};
}
let r=await run('2020-01-01');assert.equal(r.result.status,200);assert.equal(r.booking.status,'confirmed');assert.equal(r.booking.payment_status,'unpaid');assert(r.events.includes('payment-link'));assert(r.events.includes('manual_booking_payment_link_sms'));assert(r.events.includes('past_session_recorded'));for(const event of ['assignment','prep','admin_booking_confirmation','id'])assert(!r.events.includes(event));
r=await run('2020-01-01',{confirmed:false});assert.equal(r.result.status,400);assert(!r.events.includes('reserve'));
r=await run('2020-01-01',{role:'engineer'});assert.equal(r.result.status,403);assert(!r.events.includes('reserve'));
r=await run('2099-01-01');assert.equal(r.result.status,200);for(const event of ['assignment','prep','admin_booking_confirmation','payment-link'])assert(r.events.includes(event));
r=await run('2020-01-01',{mode:'manual_paid'});assert.equal(r.booking.payment_status,'paid');assert(!r.events.includes('payment-link'));
assert(wasRecordedAfterStart({booking_date:'2026-07-01',start_time:'10:00',created_at:'2026-07-01T09:30:00Z'}));
assert(!wasRecordedAfterStart({booking_date:'2026-07-01',start_time:'10:00',created_at:'2026-07-01T08:30:00Z'}));
assert(!pastSessionEmail({service_name:'Recording',booking_date:'2020-01-01',start_time:'10:00'},{full_name:'<script>'}).html.includes('<script>'));
console.log('Past booking creation, payment-link notifications, confirmation gate, owner access and future automation regression tests passed');
const webhook=await readFile(new URL('../app/api/stripe/webhook/route.js',import.meta.url),'utf8');
const paymentBlock=webhook.slice(webhook.indexOf('          if(isPaid&&payment.booking_id){'),webhook.indexOf("          if(isPaid && payment.status!=="));
for(const status of ['confirmed','completed']){
 let row={id:'booking',booking_date:'2020-01-01',start_time:'10:00',status,customers:{email:'test@example.com'}},events=[];
 const db={from(){const chain={update(p){row={...row,...p};return chain},eq(){return chain},select(){return chain},single(){return chain},then(resolve,reject){return Promise.resolve({data:row}).then(resolve,reject)}};return chain}};
 await vm.runInNewContext(`(async()=>{${paymentBlock}})()`,{db,isPaid:true,payment:{booking_id:'booking',amount_pence:10000},session:{id:'checkout',payment_intent:'pi'},inv:{},hasSessionStarted,pastSessionEmail,notifyAssignedEngineer:async()=>events.push('assignment'),sendLoggedNotification:async x=>events.push(x.type)});
 assert.equal(row.status,status);assert.equal(row.payment_status,'paid');assert.deepEqual(events,['past_session_payment_received']);
}
console.log('Past payment webhook preserves report completion and sends receipt instead of new-booking notifications');

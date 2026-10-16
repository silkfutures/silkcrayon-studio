import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {programmeSlotAllowed} from '../lib/supportedArtists.js';
const membership={id:'membership-1',customer_id:'customer-1',engineer_user_id:'engineer-1',status:'approved',starts_on:'2020-01-01',ends_on:'2099-12-31',weekdays:[0,1,2,3,4,5,6],start_time:'10:00:00',end_time:'20:00:00'};
assert.equal(programmeSlotAllowed(membership,'2099-01-05','10:00','12:00',120),true);
for(const m of [null,{...membership,status:'pending'},{...membership,status:'paused'},{...membership,ends_on:'2020-01-02'},{...membership,weekdays:[]}])assert.equal(programmeSlotAllowed(m,'2099-01-05','10:00','12:00',120),false);
for(const [start,end,duration] of [['09:00','11:00',120],['19:00','21:00',120],['10:00','11:00',60],['10:00','12:00',180],['23:00','01:00',120]])assert.equal(programmeSlotAllowed(membership,'2099-01-05',start,end,duration),false);
const source=readFileSync(new URL('../app/api/checkout/route.js',import.meta.url),'utf8');
async function checkout({signedIn=true,member=membership,rpcError=null,bodyPatch={}}={}){
 const calls={};
 const customer={id:'customer-1',full_name:'Real Artist',email:'real@example.com',artist_name:'Real',email_signup_discount_available:true};
 const db={from(table){const q={select(){return q},eq(){return q},gte(){return q},lte(){return q},in(){return q},update(row){calls[table+'Update']=row;return q},upsert(){return q},insert(){return q},maybeSingle(){return Promise.resolve({data:table==='supported_artists'?member:table==='customers'?customer:table==='staff_profiles'?{user_id:'engineer-1',full_name:'Nathan',active:true,role:'owner'}:null})},single(){return Promise.resolve({data:customer})},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q;},rpc(name,args){calls.rpc={name,args};return Promise.resolve({data:rpcError?null:'booking-1',error:rpcError?{message:rpcError}:null})}};
 const modules={
 '../../../lib/customerAuth':{getCustomerContext:async()=>signedIn?{customer}:null},
 '../../../lib/supportedArtists':{programmeSlotAllowed,PROGRAMME_RATE:3000},
 '../../../lib/publicFormGuard':{publicFormGuard:async()=>null},
 'next/server':{NextResponse:{json:(data,options={})=>({status:options.status||200,data})}},
 '../../../lib/services':{SERVICES:{'vocal-recording':{slug:'vocal-recording',name:'Vocal Recording',durations:[60,120]}},priceFor:()=>10000},
 '../../../lib/supabase':{getAdminDb:()=>db},
 '../../../lib/stripe':{getStripe:()=>({checkout:{sessions:{create:async data=>{calls.stripe=data;return{id:'checkout-1',url:'https://checkout.example.test'}}}}})},
 '../../../lib/availability':{generateSlots:()=>[{start:'10:00',end:'12:00'}]},
 '../../../lib/time':{londonDateTimeToUtc:()=>new Date('2099-01-05T10:00:00Z')},
 '../../../lib/rateLimit':{rateLimit:async()=>true},
 '../../../lib/promotions':{getPromotionFor:async()=>{throw Error('Programme must not stack promotions')}},
 '../../../lib/studioSettings':{getStudioSettings:async()=>({studioHourlyPricePence:5000})}
 };
 const context=vm.createContext({console,Date,process,URL});const module=new vm.SourceTextModule(source,{context});
 await module.link(async name=>{const exports=modules[name];assert.ok(exports,`Unexpected import ${name}`);return new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v)},{context});});await module.evaluate();
 const body={supportedArtist:true,service:'vocal-recording',duration:120,date:'2099-01-05',start:'10:00',end:'12:00',fullName:'Forged Name',email:'other@example.com',policyAccepted:true,harmfulMusicPolicy:true,amountPence:1,preferredEngineerUserId:'forged-engineer',...bodyPatch};
 const req={url:'https://silkcrayon.com/api/checkout',headers:new Headers(),json:async()=>({...body}),clone(){return this}};
 return {response:await module.namespace.POST(req),calls};
}
let result=await checkout();assert.equal(result.response.status,200);assert.equal(result.calls.stripe.line_items[0].price_data.unit_amount,6000);assert.equal(result.calls.stripe.allow_promotion_codes,false);assert.equal(result.calls.stripe.customer_email,'real@example.com');assert.equal(result.calls.stripe.metadata.email_signup_discount_applied,'false');assert.equal(result.calls.rpc.name,'reserve_supported_booking');assert.equal(result.calls.rpc.args.p_customer_id,'customer-1');
for(const options of [{signedIn:false},{member:null},{member:{...membership,status:'paused'}},{bodyPatch:{duration:60}},{bodyPatch:{service:'dry-hire'}}]){result=await checkout(options);assert.ok([401,403].includes(result.response.status));assert.equal(result.calls.stripe,undefined);}
result=await checkout({rpcError:'Monthly allowance exceeded'});assert.equal(result.response.status,409);assert.equal(result.calls.stripe,undefined);
console.log('Supported artist eligibility, identity enforcement, fixed price, no discount stacking and rejected reservation tests passed.');
// Approval must reject anonymous users, engineers and cross-site submissions
// before touching customer/programme data or sending an email.
const reviewSource=readFileSync(new URL('../app/api/admin/supported-artists/route.js',import.meta.url),'utf8');
for(const [role,crossSite] of [[null,false],['engineer',false],['owner',true]]){
 const ctx=vm.createContext({console,Date,URL,process});
 const exportsByName={
 'next/server':{NextResponse:{json:(data,options={})=>({status:options.status||200,data})}},
 '../../../../lib/auth':{getStaffContext:async()=>role?{user:{id:'staff-1'},profile:{role}}:null},
 '../../../../lib/supabase':{getAdminDb:()=>{throw Error('Unauthorized database access')}},
 '../../../../lib/notifications':{sendEmail:()=>{throw Error('Unauthorized email')}},
 '../../../../lib/supportedArtists':{escapeProgrammeHtml:v=>String(v)}
 };
 const mod=new vm.SourceTextModule(reviewSource,{context:ctx});await mod.link(async name=>new vm.SyntheticModule(Object.keys(exportsByName[name]),function(){for(const[k,v]of Object.entries(exportsByName[name]))this.setExport(k,v)},{context:ctx}));await mod.evaluate();
 const r=await mod.namespace.POST({url:'https://silkcrayon.com/api/admin/supported-artists',headers:new Headers(crossSite?{'sec-fetch-site':'cross-site'}:{}),json:async()=>({action:'approved'})});assert.equal(r.status,403);
}
console.log('Programme owner-only approval and cross-site rejection tests passed.');

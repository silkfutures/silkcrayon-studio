import * as recordingOffer from '../lib/recordingOffer.js';
import {SERVICES,priceFor} from '../lib/services.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createWebsiteCheckout} from '../lib/onsiteCheckout.js';
import {programmeSlotAllowed,programmeRate,programmeTerms} from '../lib/supportedArtists.js';
const membership={id:'membership-1',customer_id:'customer-1',engineer_user_id:'engineer-1',status:'approved',hourly_price_pence:3000,monthly_limit_minutes:480,min_duration_minutes:120,starts_on:'2020-01-01',ends_on:'2099-12-31',weekdays:[0,1,2,3,4,5,6],start_time:'10:00:00',end_time:'20:00:00'};
assert.equal(programmeSlotAllowed(membership,'2099-01-05','10:00','12:00',120),true);
for(const m of [null,{...membership,status:'pending'},{...membership,status:'paused'},{...membership,ends_on:'2020-01-02'},{...membership,weekdays:[]}])assert.equal(programmeSlotAllowed(m,'2099-01-05','10:00','12:00',120),false);
for(const [start,end,duration] of [['09:00','11:00',120],['19:00','21:00',120],['10:00','11:00',60],['10:00','12:00',180],['23:00','01:00',120]])assert.equal(programmeSlotAllowed(membership,'2099-01-05',start,end,duration),false);
const source=readFileSync(new URL('../app/api/checkout/route.js',import.meta.url),'utf8');
async function checkout({signedIn=true,member=membership,rpcError=null,bodyPatch={}}={}){
 const calls={};
 const customer={id:'customer-1',full_name:'Real Artist',email:'real@example.com',artist_name:'Real',email_signup_discount_available:false};
 const db={from(table){const q={select(){return q},eq(){return q},gte(){return q},lte(){return q},in(){return q},update(row){calls[table+'Update']=row;return q},upsert(){return q},insert(){return q},maybeSingle(){return Promise.resolve({data:table==='supported_artists'?member:table==='customers'?customer:table==='staff_profiles'?{user_id:'engineer-1',full_name:'Nathan',active:true,role:'owner'}:null})},single(){return Promise.resolve({data:table==='bookings'?{amount_pence:member.hourly_price_pence*2}:customer})},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q;},rpc(name,args){calls.rpc={name,args};return Promise.resolve({data:rpcError?null:'booking-1',error:rpcError?{message:rpcError}:null})}};
 const modules={
 '../../../lib/recordingOffer':{...recordingOffer,recordingOfferEligible:(s,d)=>recordingOffer.recordingOfferEligible(s,d,Date.parse('2026-11-16T12:00:00Z'))},
 '../../../lib/onsiteCheckout':{createWebsiteCheckout},
 '../../../lib/customerAuth':{getCustomerContext:async()=>signedIn?{customer}:null},
 '../../../lib/supportedArtists':{programmeSlotAllowed,programmeRate},
 '../../../lib/publicFormGuard':{publicFormGuard:async()=>null},
 'next/server':{NextResponse:{json:(data,options={})=>({status:options.status||200,data})}},
 '../../../lib/services':{SERVICES,priceFor},
 '../../../lib/supabase':{getAdminDb:()=>db},
 '../../../lib/stripe':{getStripe:()=>({paymentMethodDomains:{list:async()=>({data:[{id:'pmd_test',enabled:true,apple_pay:{status:'active'}}]})},checkout:{sessions:{create:async data=>{calls.stripe=data;return{id:'checkout-1',client_secret:'test_secret',url:'https://checkout.example.test'}}}}})},
 '../../../lib/availability':{generateSlots:()=>[{start:'10:00',end:'12:00'}]},
 '../../../lib/time':{londonDateTimeToUtc:()=>new Date('2099-01-05T10:00:00Z')},
 '../../../lib/rateLimit':{rateLimit:async()=>true},
 '../../../lib/promotions':{getPromotionFor:async()=>{throw Error('Programme must not stack promotions')}},
 '../../../lib/studioSettings':{getStudioSettings:async()=>({studioHourlyPricePence:5000,fullDayPricePence:40000})}
 };
 const context=vm.createContext({console,Date,process,URL});const module=new vm.SourceTextModule(source,{context});
 await module.link(async name=>{const exports=modules[name];assert.ok(exports,`Unexpected import ${name}`);return new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v)},{context});});await module.evaluate();
 const body={supportedArtist:false,service:'vocal-recording',duration:120,date:'2099-01-05',start:'10:00',end:'12:00',fullName:'Forged Name',email:'other@example.com',policyAccepted:true,harmfulMusicPolicy:true,amountPence:1,preferredEngineerUserId:'forged-engineer',...bodyPatch};
 const req={url:'https://silkcrayon.com/api/checkout',headers:new Headers(),json:async()=>({...body}),clone(){return this}};
 return {response:await module.namespace.POST(req),calls};
}

const prior=process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
try {
 process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_example';
 for(const checkoutMode of ['onsite','hosted']){
  for(const [service,duration,expected] of [
   ['vocal-recording',60,5000],['vocal-recording',120,8000],
   ['vocal-recording',180,12000],['vocal-recording',240,16000],
   ['vocal-recording',300,20000],['vocal-recording',360,24000],
   ['vocal-recording',420,28000],['vocal-recording',480,32000],
   ['voiceover',60,6000],['voiceover',120,12000],
   ['dry-hire',120,8000],['full-day',480,40000]
  ]){
   const {response,calls}=await checkout({bodyPatch:{service,duration,checkoutMode,amountPence:1,phone:'07000000000',postcode:'CF10 5EQ',dryHireAccepted:true,dryHireAgeAccepted:true}});
   assert.equal(response.status,200,JSON.stringify(response));
   assert.equal(calls.stripe.line_items[0].price_data.unit_amount,expected,service+' '+duration+' '+checkoutMode);
   assert.equal(calls.stripe.allow_promotion_codes,false);
   assert.equal(calls.rpc.args.p_amount_pence,expected);
   if(checkoutMode==='onsite'){
    assert.equal(response.data.walletsReady,true);
    assert.deepEqual(calls.stripe.payment_method_types,['card']);
    assert.equal(calls.stripe.ui_mode,'custom');
   }
  }
 }
 const expiry=Date.parse(recordingOffer.RECORDING_OFFER_END);
 assert.equal(recordingOffer.recordingOfferEligible('vocal-recording',120,expiry-1),true);
 assert.equal(recordingOffer.recordingOfferEligible('vocal-recording',120,expiry),false);
 assert.equal(recordingOffer.recordingOfferEligible('vocal-recording',60,expiry-1),false);
 for(const service of ['voiceover','dry-hire','full-day'])assert.equal(recordingOffer.recordingOfferEligible(service,120,expiry-1),false);
 console.log('Public booking: all recording durations, unchanged other services, tamper resistance, expiry, wallet/card and hosted Stripe totals passed.');
} finally {
 if(prior===undefined)delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
 else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=prior;
}

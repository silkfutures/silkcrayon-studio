import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as passPricing from '../lib/studioPassPricing.js';
import {createWebsiteCheckout} from '../lib/onsiteCheckout.js';
const now=Date.parse('2026-11-17T12:00:00Z');
const pricing={...passPricing,studioPassComparisonPrice:(h,r)=>passPricing.studioPassComparisonPrice(h,r,now)};
for(const h of [4,5,6,7,8]){
 assert.equal(passPricing.studioPassPrice(h),h*3500);
 assert.equal(pricing.studioPassComparisonPrice(h,5000),h*4000);
 assert.equal(passPricing.studioPassComparisonPrice(h,5000,Date.parse('2026-12-01T00:00:00Z')),h*5000);
}
for(const h of [0,3,9,4.5,'bad'])assert.throws(()=>passPricing.studioPassPrice(h));
async function checkout(path,body){
 const calls={};
 const customer={id:'customer',email:'test@example.com',full_name:'Test'};
 const db={from(table){
  const q={select(){return q},eq(){return q},limit(){return q},update(){return q},
   insert(row){calls.payment=row;return q},
   maybeSingle:async()=>({data:customer}),
   single:async()=>({data:{id:'payment'},error:null}),
   then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}
  };return q;
 }};
 const stripe={checkout:{sessions:{create:async params=>{calls.stripe=params;return{id:'cs_test',url:'https://checkout.example.test',client_secret:'test_secret'}}}},
  paymentMethodDomains:{list:async()=>({data:[{id:'pmd_test',enabled:true,apple_pay:{status:'active'}}]})}};
 const modules={
 '../../../../lib/studioPassPricing':pricing,
 '../../../../lib/onsiteCheckout':{createWebsiteCheckout},
 '../../../../lib/publicFormGuard':{publicFormGuard:async()=>null},
 'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status||200})}},
 '../../../../lib/supabase':{getAdminDb:()=>db},
 '../../../../lib/stripe':{getStripe:()=>stripe},
 '../../../../lib/rateLimit':{rateLimit:async()=>true},
 '../../../../lib/promotions':{getPromotionFor:async()=>null},
 '../../../../lib/studioSettings':{getStudioSettings:async()=>({studioHourlyPricePence:5000})},
 '../../../../lib/customerAuth':{getCustomerContext:async()=>({customer})}
 };
 const context=vm.createContext({console,Date,process,URL});
 const mod=new vm.SourceTextModule(readFileSync(new URL(path,import.meta.url),'utf8'),{context});
 await mod.link(name=>{assert.ok(modules[name],name);const exports=modules[name];return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v)},{context})});await mod.evaluate();
 const req={url:'https://silkcrayon.com/api/store/checkout',headers:new Headers({origin:'https://silkcrayon.com'}),json:async()=>({...body}),clone(){return this}};
 return {response:await mod.namespace.POST(req),calls};
}
const old=process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
try{
 process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_example';
 for(const checkoutMode of ['hosted','onsite'])for(const hours of [4,5,6,7,8]){
  const {response,calls}=await checkout('../app/api/store/checkout/route.js',{kind:'studio_pass',hours,checkoutMode,buyerName:'Test',buyerEmail:'test@example.com',amount:1});
  assert.equal(response.status,200,JSON.stringify(response));
  assert.equal(calls.stripe.line_items[0].price_data.unit_amount,hours*3500);
  assert.equal(calls.payment.amount_pence,hours*3500);
  assert.equal(calls.payment.list_amount_pence,hours*4000);
  assert.equal(calls.payment.discount_amount_pence,hours*500);
  assert.equal(calls.stripe.metadata.hours_credit,String(hours));
  if(checkoutMode==='onsite'){assert.equal(response.data.walletsReady,true);assert.deepEqual(calls.stripe.payment_method_types,['card']);}
 }
 for(const hours of [4,8]){
  const {response,calls}=await checkout('../app/api/customer/packages/route.js',{hours,amount:1});
  assert.equal(response.status,200);
  assert.equal(calls.stripe.line_items[0].price_data.unit_amount,hours*3500);
  assert.equal(calls.payment.discount_amount_pence,hours*500);
 }
 for(const kind of ['gift','hours']){
  const {response,calls}=await checkout('../app/api/store/checkout/route.js',{kind,hours:4,buyerName:'Test',buyerEmail:'test@example.com'});
  assert.equal(response.status,200);assert.equal(calls.stripe.line_items[0].price_data.unit_amount,20000);
 }
 const invalid=await checkout('../app/api/store/checkout/route.js',{kind:'studio_pass',hours:3});
 assert.equal(invalid.response.status,400);assert.equal(invalid.calls.stripe,undefined);
 console.log('Pass prices: all sizes, hosted/card/wallet checkout, portal, exact savings, expiry comparison, invalid hours and unchanged gift/pack prices passed.');
}finally{if(old===undefined)delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=old;}

import assert from 'node:assert/strict';
import {createWebsiteCheckout,ensureWalletDomain,cancelWebsiteCheckout} from '../lib/onsiteCheckout.js';
const prior=process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
try {
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_example';
const params={mode:'payment',invoice_creation:{enabled:true},customer_email:'test@example.com',metadata:{booking_id:'booking-1'},line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:28000}}],allow_promotion_codes:true,success_url:'https://silkcrayon.com/booking/success?session_id={CHECKOUT_SESSION_ID}',cancel_url:'https://silkcrayon.com/booking'};
let created,registrations=0;
const stripe={checkout:{sessions:{create:async p=>{created=p;return{id:'cs_test_1',client_secret:'secret',url:'https://checkout.stripe.com/test'};}}},paymentMethodDomains:{list:async()=>({data:[]}),create:async()=>{registrations++;return{id:'pmd_1',enabled:true,apple_pay:{status:'active'}};}}};
const result=await createWebsiteCheckout(stripe,params,{onsite:true,origin:'https://silkcrayon.com'});
assert.equal(created.ui_mode,'custom');assert.equal(created.success_url,undefined);assert.equal(created.cancel_url,undefined);assert.equal(created.return_url,params.success_url);assert.deepEqual(created.line_items,params.line_items);assert.deepEqual(created.metadata,params.metadata);assert.deepEqual(created.payment_method_types,['card']);assert.equal(created.allow_promotion_codes,true);assert.equal(result.response.returnUrl,'https://silkcrayon.com/booking/success?session_id=cs_test_1');assert.equal(result.response.walletsReady,true);
assert.equal(await ensureWalletDomain(stripe,'evil.example'),false);await ensureWalletDomain(stripe,'silkcrayon.com');assert.equal(registrations,1);
await createWebsiteCheckout(stripe,params,{onsite:false,origin:'https://silkcrayon.com'});assert.deepEqual(created,params);
delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
assert.deepEqual((await createWebsiteCheckout(stripe,params,{onsite:true,origin:'https://silkcrayon.com'})).response,{url:'https://checkout.stripe.com/test'});
let updates=[],expired=0,failExpire=false;
const session={id:'cs_test_1',client_secret:'secret',ui_mode:'custom',status:'open',payment_status:'unpaid',metadata:{booking_id:'booking-1'}};
stripe.checkout.sessions.retrieve=async()=>session;
stripe.checkout.sessions.expire=async()=>{if(failExpire)throw Error('payment race');expired++;};
const db={from(table){const update={table,filters:[]};const q={update(row){update.row=row;return q},eq(k,v){update.filters.push([k,v]);return q},then(resolve){updates.push(update);return Promise.resolve({error:null}).then(resolve)}};return q}};
await assert.rejects(cancelWebsiteCheckout(stripe,db,session.id,'wrong'));assert.equal(expired,0);assert.equal(updates.length,0);
session.status='complete';await assert.rejects(cancelWebsiteCheckout(stripe,db,session.id,'secret'));assert.equal(expired,0);session.status='open';
failExpire=true;await assert.rejects(cancelWebsiteCheckout(stripe,db,session.id,'secret'));assert.equal(updates.length,0);failExpire=false;
await cancelWebsiteCheckout(stripe,db,session.id,'secret');assert.equal(expired,1);assert.equal(updates[0].row.status,'cancelled');assert.deepEqual(updates[0].filters,[['id','booking-1'],['stripe_checkout_session_id',session.id],['status','pending'],['payment_status','unpaid']]);
session.metadata={studio_payment_id:'payment-1'};session.status='expired';await cancelWebsiteCheckout(stripe,db,session.id,'secret');assert.equal(expired,1);assert.equal(updates[1].table,'studio_payments');assert.equal(updates[1].row.status,'expired');assert.deepEqual(updates[1].filters,[['id','payment-1'],['stripe_checkout_session_id',session.id],['status','pending']]);
console.log('On-site checkout totals, metadata, domain allowlist, fallback, cancellation authorization and payment race tests passed.');
} finally {if(prior===undefined)delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=prior;}

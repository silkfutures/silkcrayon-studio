import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as rules from '../lib/engineerWorkRules.js';
const {offerDeadline,normaliseOfferSettings,engineerRateFor,feeFor,planPayouts,retryDelayMinutes,sessionEndUtc,sessionStartUtc,substitutionNeedsApproval,friendlyStripeError,OFFER_DEFAULTS}=rules;
const H=3600000;

// ---------- offer deadlines ----------
{
 const now=new Date('2026-10-20T09:00:00Z'),s=OFFER_DEFAULTS;
 const far=offerDeadline({now,sessionStart:new Date(now.getTime()+5*24*H),settings:s});
 assert.equal(far.ok,true);assert.equal(far.urgent,false);assert.equal(far.expiresAt.getTime(),now.getTime()+12*H);
 const soon=offerDeadline({now,sessionStart:new Date(now.getTime()+20*H),settings:s});
 assert.equal(soon.urgent,true);assert.equal(soon.expiresAt.getTime(),now.getTime()+2*H);
 const capped=offerDeadline({now,sessionStart:new Date(now.getTime()+3*H),settings:s});
 assert.equal(capped.ok,true);assert.equal(capped.expiresAt.getTime(),now.getTime()+1*H,'never later than cutoff before the session');assert.equal(capped.cappedByCutoff,true);
 assert.equal(offerDeadline({now,sessionStart:new Date(now.getTime()+2*H),settings:s}).reason,'too_late');
 assert.equal(offerDeadline({now,sessionStart:new Date(now.getTime()-H),settings:s}).reason,'session_started');
 const override=offerDeadline({now,sessionStart:new Date(now.getTime()+5*24*H),settings:s,overrideHours:24});
 assert.equal(override.expiresAt.getTime(),now.getTime()+24*H);
 const cfg=normaliseOfferSettings({engineer_offer_window_hours:'6',engineer_auto_payouts:'false',engineer_offer_cutoff_hours:'nonsense'});
 assert.equal(cfg.windowHours,6);assert.equal(cfg.autoPayouts,false);assert.equal(cfg.cutoffHours,OFFER_DEFAULTS.cutoffHours);
}
// ---------- session times (London, overnight) ----------
assert.equal(sessionStartUtc({booking_date:'2026-08-15',start_time:'18:00:00'}).toISOString(),'2026-08-15T17:00:00.000Z');
assert.equal(sessionEndUtc({booking_date:'2026-12-15',start_time:'22:00:00',end_time:'02:00:00'}).toISOString(),'2026-12-16T02:00:00.000Z');
// ---------- pay is separate from customer pricing ----------
const billy={engineer_pay_hourly_pence:2000,engineer_supported_pay_hourly_pence:1500};
assert.equal(engineerRateFor(billy,{}),2000);
assert.equal(engineerRateFor(billy,{supported_artist_id:'sa-1'}),1500);
assert.equal(engineerRateFor({engineer_pay_hourly_pence:2000,engineer_supported_pay_hourly_pence:null},{supported_artist_id:'sa-1'}),2000);
assert.equal(engineerRateFor({engineer_pay_hourly_pence:null},{}),null);
assert.equal(feeFor(2000,180),6000,'Billy: £20/h × 3h = £60');
// ---------- substitution rules ----------
assert.equal(substitutionNeedsApproval({},'x'),false);
assert.equal(substitutionNeedsApproval({preferred_engineer_user_id:'billy'},'benny'),true);
assert.equal(substitutionNeedsApproval({preferred_engineer_user_id:'billy'},'billy'),false);
assert.equal(substitutionNeedsApproval({supported_artist_id:'sa'},'benny'),true);
// ---------- payout planning ----------
{
 let [line,...rest]=planPayouts({bookedMinutes:180,actualHours:3,hourlyPence:2000,agreedFeePence:6000});
 assert.equal(line.status,'pending');assert.equal(line.amount_pence,6000);assert.equal(rest.length,0);
 [line,...rest]=planPayouts({bookedMinutes:180,actualHours:4,hourlyPence:2000,agreedFeePence:6000});
 assert.equal(line.status,'pending','booked fee still pays automatically');assert.equal(rest[0].kind,'extra_time');assert.equal(rest[0].status,'needs_approval');assert.equal(rest[0].amount_pence,2000);
 [line]=planPayouts({bookedMinutes:180,actualHours:2,hourlyPence:2000,agreedFeePence:6000});
 assert.equal(line.status,'needs_approval','short sessions are an exception');
 [line]=planPayouts({bookedMinutes:180,actualHours:3,hourlyPence:2000,issuesFlagged:true});
 assert.equal(line.status,'needs_approval');
 [line]=planPayouts({bookedMinutes:120,actualHours:2,hourlyPence:null});
 assert.equal(line.status,'needs_approval');assert.equal(line.amount_pence,0);
 [line]=planPayouts({bookedMinutes:120,actualHours:2,hourlyPence:2000,autoPayouts:false});
 assert.equal(line.status,'needs_approval');
 assert.equal(planPayouts({bookedMinutes:120,actualHours:2.1,hourlyPence:2000}).length,1,'tiny overruns are ignored');
}
// ---------- custom offer pricing + dry hire open & close ----------
{
 const {offerTerms}=rules,eng={engineer_pay_hourly_pence:2000};
 assert.deepEqual(offerTerms({engineer:eng,booking:{duration_minutes:480},customHourlyPence:1750}),{pay_hourly_pence:1750,fee_pence:14000,fee_is_flat:false},'full day at £17.50/h = £140');
 assert.deepEqual(offerTerms({engineer:eng,booking:{duration_minutes:480},customFeePence:12000}),{pay_hourly_pence:null,fee_pence:12000,fee_is_flat:true});
 assert.deepEqual(offerTerms({engineer:eng,booking:{service_slug:'dry-hire',duration_minutes:360}}),{pay_hourly_pence:null,fee_pence:2000,fee_is_flat:true},'dry hire defaults to £20 open & close');
 assert.equal(offerTerms({engineer:eng,booking:{service_slug:'dry-hire'},settings:normaliseOfferSettings({engineer_dry_hire_access_fee_pence:'2500'})}).fee_pence,2500);
 assert.deepEqual(offerTerms({engineer:eng,booking:{duration_minutes:180}}),{pay_hourly_pence:2000,fee_pence:6000,fee_is_flat:false});
 const flat=planPayouts({bookedMinutes:360,actualHours:7,hourlyPence:null,agreedFeePence:2000,flatFee:true});
 assert.equal(flat.length,1,'flat fees never add extra-time lines');assert.equal(flat[0].amount_pence,2000);assert.equal(flat[0].status,'pending');
 assert.equal(planPayouts({bookedMinutes:360,actualHours:2,agreedFeePence:2000,flatFee:true})[0].status,'pending','hours do not change a fixed fee');
 assert.equal(planPayouts({bookedMinutes:360,actualHours:6,agreedFeePence:2000,flatFee:true,issuesFlagged:true})[0].status,'needs_approval');
 const custom=planPayouts({bookedMinutes:480,actualHours:9,hourlyPence:1750,agreedFeePence:14000});
 assert.equal(custom[0].amount_pence,14000);assert.equal(custom[1].amount_pence,1750,'extra time uses the offered rate');
}
assert.equal(retryDelayMinutes(1),15);assert.equal(retryDelayMinutes(3),240);assert.equal(retryDelayMinutes(rules.PAYOUT_MAX_ATTEMPTS),null);
assert.match(friendlyStripeError({code:'balance_insufficient',message:'x'}),/balance is too low/);

// ---------- in-memory Supabase stand-in ----------
function fakeDb(tables){
 let seq=0;const id=()=>`id-${++seq}`;
 const rpcs={};
 function query(table){
  const filters=[];let mode='select',patch=null,insertRows=null,orders=[],lim=null,returning=false;
  const rows=()=>tables[table]||(tables[table]=[]);
  const match=r=>filters.every(f=>f(r));
  const api={
   select(){if(mode!=='select')returning=true;return api;},
   update(p){mode='update';patch=p;return api;},
   insert(r){mode='insert';insertRows=Array.isArray(r)?r:[r];return api;},
   upsert(r){const list=Array.isArray(r)?r:[r];for(const x of list){const ex=rows().find(y=>y.key===x.key);if(ex)Object.assign(ex,x);else rows().push({...x});}mode='noop';return api;},
   eq(k,v){filters.push(r=>r[k]===v);return api;},neq(k,v){filters.push(r=>r[k]!==v);return api;},
   in(k,v){filters.push(r=>v.includes(r[k]));return api;},not(k,op,v){filters.push(r=>op==='is'?(r[k]??null)!==v:r[k]!==v);return api;},is(k,v){filters.push(r=>(r[k]??null)===v);return api;},
   lte(k,v){filters.push(r=>r[k]!=null&&r[k]<=v);return api;},lt(k,v){filters.push(r=>r[k]!=null&&r[k]<v);return api;},
   gt(k,v){filters.push(r=>r[k]!=null&&r[k]>v);return api;},gte(k,v){filters.push(r=>r[k]!=null&&r[k]>=v);return api;},like(){return api;},
   order(k){orders.push(k);return api;},limit(n){lim=n;return api;},
   run(){
    if(mode==='noop')return {data:null,error:null};
    if(mode==='insert'){const out=insertRows.map(r=>({id:id(),attempts:0,created_at:new Date().toISOString(),...r}));
     if(table==='engineer_payouts')for(const r of out)if(rows().some(x=>x.booking_id===r.booking_id&&x.kind===r.kind&&x.status!=='cancelled'))return {data:null,error:{code:'23505'}};
     rows().push(...out);return {data:out,error:null};}
    let hit=rows().filter(match);
    if(mode==='update'){for(const r of hit)Object.assign(r,patch);return {data:returning?hit.map(r=>({...r})):null,error:null};}
    for(const k of orders.reverse())hit=[...hit].sort((a,b)=>a[k]>b[k]?1:a[k]<b[k]?-1:0);
    if(lim!=null)hit=hit.slice(0,lim);return {data:hit.map(r=>({...r})),error:null};
   },
   maybeSingle(){const r=api.run();return Promise.resolve({data:Array.isArray(r.data)?r.data[0]||null:r.data,error:r.error});},
   single(){return api.maybeSingle();},
   then(res,rej){return Promise.resolve(api.run()).then(res,rej);}
  };
  return api;
 }
 return {from:query,rpc:(n,a)=>Promise.resolve(rpcs[n](a)),rpcs,tables};
}
async function load(path,modules){
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const context=vm.createContext({console,Date,process,URL,setTimeout});
 const mod=new vm.SourceTextModule(source,{context});
 await mod.link(async name=>{const exp=modules[name];assert.ok(exp,`Unexpected import ${name}`);return new vm.SyntheticModule(Object.keys(exp),function(){for(const [k,v] of Object.entries(exp))this.setExport(k,v);},{context});});
 await mod.evaluate();return mod.namespace;
}
const emails=[];
const notifications={sendEmail:async m=>{emails.push(m);return {ok:true};},ownerEmails:async()=>['owner@silkcrayon.com'],staffEmail:async()=>'eng@example.com',notifyAssignedEngineer:async()=>({ok:true})};
const emailTemplates={lowBalanceEmail:()=>({subject:'low balance',html:''}),payoutPaidEmail:()=>({subject:'paid',html:''}),payoutSetupNudgeEmail:()=>({subject:'setup',html:''}),payoutFailedOwnerEmail:()=>({subject:'failed',html:''}),offerEmail:()=>({subject:'offer',html:''}),ownerOfferAlertEmail:({kind})=>({subject:`alert:${kind}`,html:''}),siteUrl:()=>'https://silkcrayon.com',prettyDeadline:v=>String(v)};

// ---------- payouts: idempotent, funded, held when not set up ----------
{
 const past=new Date(Date.now()-H).toISOString();
 const db=fakeDb({
  staff_profiles:[{user_id:'billy',engineer_name:'Billy',role:'engineer',active:true,email:'billy@example.com',stripe_connect_account_id:'acct_billy',stripe_transfers_active:true},{user_id:'benny',engineer_name:'Benny',role:'engineer',active:true,email:'benny@example.com'}],
  bookings:[{id:'b1',booking_date:'2026-10-19',start_time:'10:00:00',end_time:'13:00:00',stripe_payment_intent_id:'pi_1'}],
  engineer_payouts:[
   {id:'p1',booking_id:'b1',engineer_user_id:'billy',kind:'session',funding_source:'card',amount_pence:6000,status:'pending',attempts:0,release_after:past,created_at:past},
   {id:'p2',booking_id:'b2',engineer_user_id:'benny',kind:'session',funding_source:'off_stripe',approved_at:past,amount_pence:4000,status:'pending',attempts:0,release_after:past,created_at:past},
   {id:'p3',booking_id:'b3',engineer_user_id:'billy',kind:'session',funding_source:'card',amount_pence:5000,status:'pending',attempts:0,release_after:new Date(Date.now()+H).toISOString(),created_at:past}
  ]});
 const transfers=[];let failNext=null,stripeBalance=0;
 const stripe={
  transfers:{list:async({transfer_group})=>({data:transfers.filter(t=>t.transfer_group===transfer_group)}),create:async(p,o)=>{if(failNext){const e=failNext;failNext=null;throw e;}const t={id:`tr_${transfers.length+1}`,...p,reversed:false,key:o.idempotencyKey};transfers.push(t);return t;}},
  paymentIntents:{retrieve:async()=>({latest_charge:'ch_1',currency:'gbp',amount_received:15000})},
  balance:{retrieve:async()=>({available:[{currency:'gbp',amount:stripeBalance}],pending:[]})}
 };
 const m=await load('../lib/engineerPayouts.js',{'./stripe':{getStripe:()=>stripe},'./notifications':notifications,'./bookingEvents':{recordBookingEvent:async()=>{}},'./engineerWorkEmails':emailTemplates,'./engineerWorkRules.js':rules,'./engineerOffers':{getEngineerWorkSettings:async()=>normaliseOfferSettings({})}});
 db.tables.studio_settings=[];
 const [a,b]=await Promise.all([m.executePayout(db,'p1',{stripe}),m.executePayout(db,'p1',{stripe})]);
 assert.equal([a,b].filter(x=>x.status==='paid').length,1,'concurrent runners pay once');
 assert.equal(transfers.length,1);assert.equal(transfers[0].source_transaction,'ch_1','card bookings fund the transfer from their own charge');assert.equal(transfers[0].destination,'acct_billy');
 assert.equal(db.tables.engineer_payouts[0].status,'paid');
 assert.equal((await m.executePayout(db,'p1',{stripe})).skipped,true,'paid payouts are never resent');
 // A previous attempt succeeded at Stripe but the result was lost → record it, don't pay again.
 db.tables.engineer_payouts[0].status='failed';db.tables.engineer_payouts[0].next_attempt_at=past;
 assert.equal((await m.executePayout(db,'p1',{stripe})).skipped,'already_paid','a recorded transfer is never re-sent');
 Object.assign(db.tables.engineer_payouts[0],{stripe_transfer_id:null,paid_via:null});
 assert.equal((await m.executePayout(db,'p1',{stripe})).status,'paid');assert.equal(transfers.length,1,'transfer_group check prevents a duplicate');
 // Not set up → on hold, one nudge.
 assert.equal((await m.executePayout(db,'p2',{stripe})).status,'on_hold');
 assert.equal(emails.filter(e=>e.source==='engineer_payout_setup').length,1);
 assert.equal((await m.executePayout(db,'p3',{stripe})).skipped,'not_due','nothing is paid before the session ends');
 // Setup completes → held payouts resume.
 await m.syncConnectAccount(db,{id:'acct_benny_missing',capabilities:{transfers:'active'}});
 db.tables.staff_profiles[1].stripe_connect_account_id='acct_benny';
 await m.syncConnectAccount(db,{id:'acct_benny',capabilities:{transfers:'active'},payouts_enabled:true,details_submitted:true});
 assert.equal(db.tables.engineer_payouts[1].status,'pending');
 // Low Stripe balance → friendly failure, retry scheduled, owner told once.
 failNext=Object.assign(new Error('Insufficient funds'),{code:'balance_insufficient'});
 const res=await m.executePayout(db,'p2',{stripe});
 assert.equal(res.status,'failed');assert.match(res.error,/balance is too low/);assert.ok(db.tables.engineer_payouts[1].next_attempt_at);
 assert.equal(emails.filter(e=>e.source==='engineer_payout_failed').length,1);
 const retry=await m.approvePayout(db,{id:'p2',amountPence:null,ctx:{user:{id:'owner'}}});
 assert.equal(retry.ok,true);assert.equal(retry.result.status,'paid');assert.equal(transfers.length,2);
 assert.notEqual(transfers[1].key,undefined);
 // Creating payouts from a report: unique per booking+kind.
 db.tables.staff_profiles.push({user_id:'eng3',engineer_name:'Eng3',role:'engineer',active:true,engineer_pay_hourly_pence:2000});
 const booking={id:'b9',service_slug:'vocal-recording',booking_date:'2026-10-19',start_time:'10:00:00',end_time:'13:00:00',duration_minutes:180,engineer_user_id:'eng3',engineer_fee_pence:6000,engineer_pay_hourly_pence:2000};
 const first=await m.createPayoutsForReport(db,{bookingBefore:booking,engineerUserId:'eng3',report:{id:'r9'},actualHours:3});
 const again=await m.createPayoutsForReport(db,{bookingBefore:booking,engineerUserId:'eng3',report:{id:'r9'},actualHours:3});
 assert.equal(first.created,1);assert.equal(first.total,6000);assert.equal(again.created,0,'re-submitting a report never doubles the payout');
 const dry={id:'dh1',service_slug:'dry-hire',booking_date:'2026-10-19',start_time:'10:00:00',end_time:'16:00:00',duration_minutes:360,engineer_user_id:'eng3',engineer_fee_pence:2000,engineer_fee_flat:true};
 const dryPay=await m.createPayoutsForReport(db,{bookingBefore:dry,engineerUserId:'eng3',report:{id:'rd'},actualHours:6});
 assert.equal(dryPay.total,2000,'dry hire opener gets the flat £20');
 assert.equal((await m.createPayoutsForReport(db,{bookingBefore:{...dry,id:'dh2',engineer_user_id:null,engineer_fee_pence:null},engineerUserId:'eng3',report:{id:'rd2'},actualHours:6})).skipped,'dry_hire','no open & close job accepted → nothing paid');
 // ---- off-Stripe safety ----
 assert.equal(db.tables.engineer_payouts.find(p=>p.booking_id==='b9').status,'needs_approval','a booking not paid by card never pays automatically');
 assert.equal(db.tables.engineer_payouts.find(p=>p.booking_id==='b9').funding_source,'off_stripe');
 const cardBooking={...booking,id:'bc1',stripe_payment_intent_id:'pi_c',payment_status:'paid',payment_method:'stripe'};
 await m.createPayoutsForReport(db,{bookingBefore:cardBooking,engineerUserId:'eng3',report:{id:'rc1'},actualHours:3});
 const cardPayout=db.tables.engineer_payouts.find(p=>p.booking_id==='bc1');
 assert.equal(cardPayout.status,'pending');assert.equal(cardPayout.funding_source,'card');
 for(const method of ['bank_transfer','manual','credits','cash']){
  await m.createPayoutsForReport(db,{bookingBefore:{...booking,id:`bx-${method}`,payment_status:'paid',payment_method:method,stripe_payment_intent_id:method==='credits'?'pi_old':null},engineerUserId:'eng3',report:{id:`r-${method}`},actualHours:3});
  assert.equal(db.tables.engineer_payouts.find(p=>p.booking_id===`bx-${method}`).status,'needs_approval',`${method} is held for the owner`);
 }
 // Even if something sets an unapproved off-Stripe payout to pending, the runner refuses to send it.
 const offId=db.tables.engineer_payouts.find(p=>p.booking_id==='bx-bank_transfer').id;
 db.tables.staff_profiles.find(x=>x.user_id==='eng3').stripe_connect_account_id='acct_eng3';db.tables.staff_profiles.find(x=>x.user_id==='eng3').stripe_transfers_active=true;
 const off=db.tables.engineer_payouts.find(p=>p.id===offId);off.status='pending';
 const before=transfers.length;
 assert.equal((await m.executePayout(db,offId,{stripe})).status,'needs_approval');assert.equal(transfers.length,before,'no transfer without the owner choosing Pay via Stripe');
 // Mark as paid outside Stripe → closed for good.
 assert.equal((await m.markPaidOutsideStripe(db,{id:offId,note:'Monzo',ctx:{user:{id:'owner'}},stripe})).ok,true);
 assert.equal(off.status,'paid');assert.equal(off.paid_via,'outside_stripe');
 assert.equal((await m.approvePayout(db,{id:offId,amountPence:null,ctx:{user:{id:'owner'}}})).ok,false,'a payout paid by hand can never be sent by Stripe');
 off.status='pending';off.approved_at=past;assert.equal((await m.executePayout(db,offId,{stripe})).skipped,'already_paid');assert.equal(transfers.length,before);off.status='paid';
 // If Stripe secretly already paid it, marking it by hand is refused and it's recorded as paid via Stripe.
 const lost=db.tables.engineer_payouts.find(p=>p.booking_id==='bx-manual');lost.status='failed';lost.attempts=1;lost.approved_at=past;
 transfers.push({id:'tr_lost',transfer_group:`engineer_payout_${lost.id}`,destination:'acct_eng3',amount:6000,reversed:false});
 const dup=await m.markPaidOutsideStripe(db,{id:lost.id,ctx:{user:{id:'owner'}},stripe});
 assert.equal(dup.ok,false);assert.match(dup.error,/already paid/);assert.equal(lost.paid_via,'stripe');assert.equal(lost.stripe_transfer_id,'tr_lost');
 const lostCancel=await m.cancelPayout(db,{id:lost.id,stripe});assert.equal(lostCancel.ok,false);
 // Card payout whose card payment can't fund it is held, not moved onto the balance.
 stripe.paymentIntents.retrieve=async()=>({latest_charge:'ch_x',currency:'gbp',amount_received:100});
 const r1=await m.executePayout(db,cardPayout.id,{stripe});
 assert.equal(r1.status,'needs_approval');assert.equal(cardPayout.funding_source,'off_stripe');assert.equal(transfers.length,before+1,'only the lost transfer exists');
 // Low balance: approved off-Stripe payouts vs Stripe balance, one email a day.
 emails.length=0;
 const cash=db.tables.engineer_payouts.find(p=>p.booking_id==='bx-cash');cash.status='failed';cash.approved_at=past;cash.next_attempt_at=new Date(Date.now()+H).toISOString();
 stripeBalance=2000;
 const chk=await m.balanceCheck(db,{stripe});assert.equal(chk.needed,6000);assert.equal(chk.available,2000);assert.equal(chk.short,4000);
 assert.equal((await m.lowBalanceAlert(db,{stripe})).alerted,true);assert.equal((await m.lowBalanceAlert(db,{stripe})).alerted,false,'max one alert a day');
 assert.equal(emails.filter(e=>e.source==='engineer_low_balance').length,1);
 stripeBalance=10000;assert.equal((await m.lowBalanceAlert(db,{stripe})).lowBalance,false);
 db.tables.staff_profiles.push({user_id:'own',role:'owner',active:true});
 assert.equal((await m.createPayoutsForReport(db,{bookingBefore:{...booking,id:'b10'},engineerUserId:'own',report:{id:'r10'},actualHours:3})).skipped,'owner');
}

// ---------- offers: decline → backup, approval gate, unfilled alert ----------
{
 emails.length=0;
 const future='2099-06-01';
 const db=fakeDb({
  bookings:[{id:'bk',status:'confirmed',service_slug:'vocal-recording',booking_date:future,start_time:'12:00:00',end_time:'15:00:00',duration_minutes:180,preferred_engineer_user_id:'billy',customers:{artist_name:'Artist'}}],
  staff_profiles:[{user_id:'billy',engineer_name:'Billy',role:'engineer',active:true,email:'b@x',engineer_pay_hourly_pence:2000},{user_id:'benny',engineer_name:'Benny',role:'engineer',active:true,email:'n@x',engineer_pay_hourly_pence:2500},{user_id:'nathan',engineer_name:'Nathan',role:'owner',active:true,email:'o@x'}],
  engineer_session_offers:[],studio_settings:[]
 });
 const events=[];
 const m=await load('../lib/engineerOffers.js',{'./customerAuth':{newToken:()=>`tok-${Math.random()}`.padEnd(30,'x'),tokenHash:t=>`h:${t}`},'./notifications':notifications,'./sms':{sendSms:async()=>({ok:true})},'./bookingEvents':{recordBookingEvent:async e=>events.push(e.eventType)},'./engineerWorkEmails':emailTemplates,'./engineerWorkRules.js':rules});
 // A clash blocks the offer.
 db.tables.bookings.push({id:'other',status:'confirmed',engineer_user_id:'benny',booking_date:future,start_time:'14:00:00',end_time:'16:00:00'});
 const clash=await m.createOfferRound(db,{bookingId:'bk',engineerUserIds:['billy','benny']});
 assert.equal(clash.ok,false);assert.match(clash.error,/Benny already has a session/);
 db.tables.bookings.pop();
 const bad=await m.createOfferRound(db,{bookingId:'bk',engineerUserIds:['billy'],feePence:1000,hourlyPence:1750});
 assert.equal(bad.ok,false);
 const r=await m.createOfferRound(db,{bookingId:'bk',engineerUserIds:['billy','benny','nathan']});
 assert.equal(r.ok,true);assert.equal(r.state,'awaiting');
 const offers=db.tables.engineer_session_offers;
 assert.deepEqual(offers.map(o=>o.status),['sent','queued','queued']);
 assert.equal(offers[0].fee_pence,6000);assert.equal(offers[1].fee_pence,7500);
 assert.equal(offers[1].requires_owner_approval,true,'artist chose Billy, so substitutes need approval');
 assert.equal(emails.filter(e=>e.source==='engineer_session_offer').length,1,'only the first choice is emailed');
 // Billy declines → artist chose him, so the owner must approve Benny first.
 const d=await m.respondToOffer(db,{offer:{...offers[0]},decision:'decline',reason:'busy'});
 assert.equal(d.ok,true);assert.equal(offers[0].status,'declined');assert.equal(offers[1].status,'queued');
 assert.equal(db.tables.bookings[0].engineer_offer_status,'needs_owner');
 assert.equal(emails.filter(e=>e.subject==='alert:needs_owner').length,1);
 assert.equal((await m.respondToOffer(db,{offer:{...offers[0]},decision:'decline'})).ok,false,'a closed offer cannot be answered twice');
 await m.approveNextBackup(db,{bookingId:'bk'});
 assert.equal(offers[1].status,'sent');assert.equal(db.tables.bookings[0].engineer_offer_status,'awaiting');
 // Benny doesn't answer in time → expires → Nathan needs approval too.
 offers[1].expires_at=new Date(Date.now()-1000).toISOString();
 const due=await m.processDueOffers(db);
 assert.equal(due.offersAdvanced>=1,true);assert.equal(offers[1].status,'expired');assert.equal(db.tables.bookings[0].engineer_offer_status,'needs_owner');
 await m.approveNextBackup(db,{bookingId:'bk'});
 assert.equal(offers[2].status,'sent');
 // Accept goes through the atomic RPC.
 db.rpcs.accept_engineer_offer=({p_offer_id})=>{const o=offers.find(x=>x.id===p_offer_id);if(o.status!=='sent')return {data:{ok:false,reason:'closed'},error:null};o.status='accepted';Object.assign(db.tables.bookings[0],{engineer_user_id:o.engineer_user_id,engineer_offer_status:'accepted',engineer_fee_pence:o.fee_pence});return {data:{ok:true},error:null};};
 const acc=await m.respondToOffer(db,{offer:{...offers[2]},decision:'accept'});
 assert.equal(acc.ok,true);assert.equal(db.tables.bookings[0].engineer_user_id,'nathan');assert.ok(events.includes('engineer_accepted'));
 // New round where everyone declines → unfilled + owner alert.
 db.tables.bookings[0]={...db.tables.bookings[0],engineer_user_id:null,engineer_offer_status:null,preferred_engineer_user_id:null,engineer_offer_alert_sent_at:null};
 await m.createOfferRound(db,{bookingId:'bk',engineerUserIds:['benny']});
 const live=offers.find(o=>o.status==='sent');
 await m.respondToOffer(db,{offer:{...live},decision:'decline'});
 assert.equal(db.tables.bookings[0].engineer_offer_status,'unfilled');
 assert.equal(emails.filter(e=>e.subject==='alert:unfilled').length,1);
 // Cancelled booking closes open offers.
 db.tables.bookings[0].engineer_offer_alert_sent_at=null;
 await m.createOfferRound(db,{bookingId:'bk',engineerUserIds:['billy']});
 db.tables.bookings[0].status='cancelled';
 await m.advanceOfferQueue(db,'bk');
 assert.equal(offers.filter(o=>['sent','queued'].includes(o.status)).length,0);
}
{
 const db=fakeDb({bookings:[{id:'dry',status:'confirmed',service_slug:'dry-hire',booking_date:'2099-06-02',start_time:'10:00:00',end_time:'18:00:00',duration_minutes:480,customers:{artist_name:'Hirer'}},{id:'day',status:'confirmed',service_slug:'vocal-recording',booking_date:'2099-06-03',start_time:'10:00:00',end_time:'18:00:00',duration_minutes:480,customers:{artist_name:'Artist'}}],staff_profiles:[{user_id:'billy',engineer_name:'Billy',role:'engineer',active:true,email:'b@x',engineer_pay_hourly_pence:2000}],engineer_session_offers:[],studio_settings:[]});
 const m=await load('../lib/engineerOffers.js',{'./customerAuth':{newToken:()=>`tok-${Math.random()}`.padEnd(30,'x'),tokenHash:t=>`h:${t}`},'./notifications':notifications,'./sms':{sendSms:async()=>({ok:true})},'./bookingEvents':{recordBookingEvent:async()=>{}},'./engineerWorkEmails':emailTemplates,'./engineerWorkRules.js':rules});
 assert.equal((await m.createOfferRound(db,{bookingId:'dry',engineerUserIds:['billy']})).ok,true,'dry hires can be offered');
 assert.deepEqual([db.tables.engineer_session_offers[0].fee_pence,db.tables.engineer_session_offers[0].fee_is_flat],[2000,true]);
 await m.createOfferRound(db,{bookingId:'day',engineerUserIds:['billy'],hourlyPence:1750});
 const o=db.tables.engineer_session_offers.find(x=>x.booking_id==='day');
 assert.deepEqual([o.pay_hourly_pence,o.fee_pence,o.fee_is_flat],[1750,14000,false]);
}
// ---------- everyone at once: first to accept wins ----------
{
 emails.length=0;
 const db=fakeDb({bookings:[{id:'bc',status:'confirmed',service_slug:'vocal-recording',booking_date:'2099-07-01',start_time:'12:00:00',end_time:'15:00:00',duration_minutes:180,preferred_engineer_user_id:'billy',customers:{artist_name:'A'}}],staff_profiles:['billy','benny','eng3'].map(u=>({user_id:u,engineer_name:u,role:'engineer',active:true,email:`${u}@x`,engineer_pay_hourly_pence:2000})),engineer_session_offers:[],studio_settings:[]});
 const m=await load('../lib/engineerOffers.js',{'./customerAuth':{newToken:()=>`tok-${Math.random()}`.padEnd(30,'x'),tokenHash:t=>`h:${t}`},'./notifications':notifications,'./sms':{sendSms:async()=>({ok:true})},'./bookingEvents':{recordBookingEvent:async()=>{}},'./engineerWorkEmails':emailTemplates,'./engineerWorkRules.js':rules});
 const r=await m.createOfferRound(db,{bookingId:'bc',engineerUserIds:['billy','benny','eng3'],mode:'broadcast'});
 const offers=db.tables.engineer_session_offers;
 assert.equal(r.broadcast,true);assert.deepEqual(offers.map(o=>o.status),['sent','sent','sent'],'everyone gets it at once');
 assert.equal(offers.every(o=>!o.requires_owner_approval),true);assert.equal(new Set(offers.map(o=>o.expires_at)).size,1,'same deadline');
 assert.equal(emails.filter(e=>e.source==='engineer_session_offer').length,3);
 await m.respondToOffer(db,{offer:{...offers[0]},decision:'decline'});
 assert.equal(db.tables.bookings[0].engineer_offer_status,'awaiting','others still open after one decline');
 db.rpcs.accept_engineer_offer=({p_offer_id})=>{const o=offers.find(x=>x.id===p_offer_id);if(o.status!=='sent')return {data:{ok:false,reason:'closed',status:o.status},error:null};o.status='accepted';for(const x of offers)if(x!==o&&['sent','queued'].includes(x.status))x.status='cancelled';Object.assign(db.tables.bookings[0],{engineer_user_id:o.engineer_user_id,engineer_offer_status:'accepted'});return {data:{ok:true},error:null};};
 const [first,second]=await Promise.all([m.respondToOffer(db,{offer:{...offers[1]},decision:'accept'}),m.respondToOffer(db,{offer:{...offers[2]},decision:'accept'})]);
 assert.equal(first.ok,true);assert.equal(second.ok,false);assert.match(second.error,/accepted it first/);
 assert.equal(db.tables.bookings[0].engineer_user_id,'benny');
}
console.log('Engineer offers & payouts tests passed');

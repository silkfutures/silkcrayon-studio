// Automatic engineer payouts via Stripe Connect transfers.
// Flow: session report saved → payout lines created (release after the scheduled end) → runner transfers
// the agreed fee to the engineer's connected account. Exceptions wait for the owner.
import {getStripe} from './stripe';
import {sendEmail,ownerEmails,staffEmail} from './notifications';
import {recordBookingEvent} from './bookingEvents';
import {payoutPaidEmail,payoutSetupNudgeEmail,payoutFailedOwnerEmail,lowBalanceEmail,siteUrl} from './engineerWorkEmails';
import {planPayouts,engineerRateFor,sessionEndUtc,retryDelayMinutes,friendlyStripeError,PAYOUT_MAX_ATTEMPTS} from './engineerWorkRules.js';
import {getEngineerWorkSettings} from './engineerOffers';

const nowIso=()=>new Date().toISOString();
const STAFF_FIELDS='user_id,full_name,engineer_name,role,active,email,engineer_pay_hourly_pence,engineer_supported_pay_hourly_pence,stripe_connect_account_id,stripe_transfers_active,stripe_payouts_enabled,stripe_details_submitted';

const OFF_STRIPE_NOTE='Customer didn’t pay this session by card through Stripe — choose Pay via Stripe or Mark as paid outside Stripe.';
/** Only a fully paid Stripe card booking can fund its own engineer payout automatically. */
export function cardFunded(booking){
 return Boolean(booking?.stripe_payment_intent_id)&&['paid','part_refunded'].includes(booking?.payment_status)&&String(booking?.payment_method||'')==='stripe';
}

/** Called when "Finish & save session" is pressed for a booking. Never throws into the report flow. */
export async function createPayoutsForReport(db,{bookingBefore,engineerUserId,report,actualHours,issuesFlagged=false,issuesNote=''}){
 try{
  if(!bookingBefore?.id||!engineerUserId)return {created:0,skipped:'no_engineer'};
  const dryHire=bookingBefore.service_slug==='dry-hire';
  // Dry hire only pays someone who accepted (or was given) the open & close job for that booking.
  if(dryHire&&(bookingBefore.engineer_user_id!==engineerUserId||bookingBefore.engineer_fee_pence==null))return {created:0,skipped:'dry_hire'};
  const {data:staff}=await db.from('staff_profiles').select(STAFF_FIELDS).eq('user_id',engineerUserId).maybeSingle();
  if(!staff||staff.role==='owner')return {created:0,skipped:'owner'};
  const settings=await getEngineerWorkSettings(db);
  const sameEngineer=bookingBefore.engineer_user_id===engineerUserId;
  const hourly=sameEngineer&&bookingBefore.engineer_pay_hourly_pence!=null?bookingBefore.engineer_pay_hourly_pence:engineerRateFor(staff,bookingBefore);
  const agreed=sameEngineer&&bookingBefore.engineer_fee_pence!=null?bookingBefore.engineer_fee_pence:null;
  const flatFee=sameEngineer&&(Boolean(bookingBefore.engineer_fee_flat)||dryHire);
  const lines=planPayouts({bookedMinutes:bookingBefore.duration_minutes,actualHours,hourlyPence:hourly,agreedFeePence:agreed,issuesFlagged,autoPayouts:settings.autoPayouts,flatFee});
  const end=sessionEndUtc(bookingBefore)||new Date();
  let created=0,total=0;
  const card=cardFunded(bookingBefore);
  for(const line of lines){
   // Cash, bank transfer, prepaid hours and extra time are never sent from the Stripe balance automatically.
   const funding=card&&line.kind==='session'?'card':'off_stripe';
   const held=funding==='off_stripe';
   const note=[held?OFF_STRIPE_NOTE:null,line.note,issuesFlagged&&issuesNote?`Issue: ${String(issuesNote).slice(0,300)}`:null].filter(Boolean).join(' ')||null;
   const {error}=await db.from('engineer_payouts').insert({booking_id:bookingBefore.id,session_report_id:report?.id||null,engineer_user_id:engineerUserId,engineer_name:staff.engineer_name||staff.full_name,...line,status:held?'needs_approval':line.status,funding_source:funding,note,release_after:end.toISOString()});
   if(error){if(error.code==='23505')continue;throw error;}
   created++;total+=line.amount_pence;
  }
  if(report?.id&&total)await db.from('session_reports').update({engineer_fee_pence:total}).eq('id',report.id);
  return {created,total};
 }catch(e){console.error('Engineer payout creation failed',e?.message||e);return {created:0,error:e?.message};}
}

async function chargeFor(stripe,booking,amount){
 if(!booking?.stripe_payment_intent_id)return null;
 try{
  const pi=await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
  const chargeId=typeof pi.latest_charge==='string'?pi.latest_charge:pi.latest_charge?.id;
  if(!chargeId||pi.currency!=='gbp'||Number(pi.amount_received||0)<amount)return null;
  return chargeId;
 }catch{return null;}
}

async function notifyOwnerOnce(db,payout,engineerName,error){
 const {data:claim}=await db.from('engineer_payouts').update({owner_alerted_at:nowIso()}).eq('id',payout.id).is('owner_alerted_at',null).select('id').maybeSingle();
 if(!claim)return;
 const msg=payoutFailedOwnerEmail({payout,engineerName,error});
 for(const to of await ownerEmails())await sendEmail({to,source:'engineer_payout_failed',...msg});
}

async function holdForSetup(db,payout,staff){
 await db.from('engineer_payouts').update({status:'on_hold',last_error:'Waiting for the engineer to finish payout setup.',attempts:Math.max(0,payout.attempts-1),updated_at:nowIso()}).eq('id',payout.id);
 const {data:claim}=await db.from('engineer_payouts').update({engineer_setup_nudged_at:nowIso()}).eq('id',payout.id).is('engineer_setup_nudged_at',null).select('id').maybeSingle();
 if(claim){const to=staff?.email||await staffEmail(payout.engineer_user_id);if(to)await sendEmail({to,source:'engineer_payout_setup',...payoutSetupNudgeEmail({payout,engineerName:staff?.engineer_name||staff?.full_name||'there'})});}
 return {id:payout.id,status:'on_hold'};
}

// A card-funded payout that can't use the card payment is never silently moved onto the Stripe balance.
async function holdOffStripe(db,payout,reason){
 await db.from('engineer_payouts').update({status:'needs_approval',funding_source:'off_stripe',approved_at:null,next_attempt_at:null,attempts:Math.max(0,payout.attempts-1),note:`${reason} ${OFF_STRIPE_NOTE}`,updated_at:nowIso()}).eq('id',payout.id).eq('status','processing');
 return {id:payout.id,status:'needs_approval'};
}

/** Send one payout. Claimed with a conditional update so two runners can never both send it. */
export async function executePayout(db,payoutId,{stripe=null}={}){
 const {data:payout}=await db.from('engineer_payouts').select('*').eq('id',payoutId).maybeSingle();
 if(!payout||!['pending','failed'].includes(payout.status))return {id:payoutId,skipped:true};
 if(new Date(payout.release_after).getTime()>Date.now())return {id:payoutId,skipped:'not_due'};
 if(payout.paid_via||payout.stripe_transfer_id)return {id:payoutId,skipped:'already_paid'};
 // Off-Stripe payouts only ever leave the Stripe balance after the owner pressed "Pay via Stripe".
 if(payout.funding_source==='off_stripe'&&!payout.approved_at){
  await db.from('engineer_payouts').update({status:'needs_approval',next_attempt_at:null,updated_at:nowIso()}).eq('id',payout.id).eq('status',payout.status);
  return {id:payoutId,status:'needs_approval'};
 }
 const {data:claimed}=await db.from('engineer_payouts').update({status:'processing',attempts:payout.attempts+1,updated_at:nowIso()}).eq('id',payout.id).eq('status',payout.status).eq('attempts',payout.attempts).select('*').maybeSingle();
 if(!claimed)return {id:payoutId,skipped:'raced'};
 const {data:staff}=await db.from('staff_profiles').select(STAFF_FIELDS).eq('user_id',claimed.engineer_user_id).maybeSingle();
 const name=staff?.engineer_name||staff?.full_name||claimed.engineer_name||'Engineer';
 if(!claimed.amount_pence){await db.from('engineer_payouts').update({status:'needs_approval',last_error:'Amount is £0 — set the amount to pay.',updated_at:nowIso()}).eq('id',claimed.id);return {id:claimed.id,status:'needs_approval'};}
 if(!staff?.stripe_connect_account_id||!staff.stripe_transfers_active)return holdForSetup(db,claimed,staff);
 const {data:booking}=claimed.booking_id?await db.from('bookings').select('*,customers(*)').eq('id',claimed.booking_id).maybeSingle():{data:null};
 const group=`engineer_payout_${claimed.id}`;
 try{
  stripe=stripe||getStripe();
  // Duplicate guard: a previous attempt may have succeeded before we could record it.
  const existing=await stripe.transfers.list({transfer_group:group,limit:3});
  let transfer=(existing?.data||[]).find(t=>!t.reversed&&t.amount===claimed.amount_pence&&t.destination===staff.stripe_connect_account_id);
  if(!transfer){
   const base={amount:claimed.amount_pence,currency:'gbp',destination:staff.stripe_connect_account_id,transfer_group:group,
    description:`Silkcrayon ${claimed.kind==='extra_time'?'extra time':'session'}${booking?` · ${booking.booking_date} ${String(booking.start_time).slice(0,5)}`:''}`.slice(0,200),
    metadata:{silkcrayon_payout_id:claimed.id,booking_id:claimed.booking_id||'',engineer_user_id:claimed.engineer_user_id,kind:claimed.kind}};
   const source=claimed.funding_source==='card'?await chargeFor(stripe,booking,claimed.amount_pence):null;
   if(claimed.funding_source==='card'&&!source)return holdOffStripe(db,claimed,'Couldn’t link this payout to the customer’s card payment (it may have been refunded or changed).');
   // Key changes per attempt/approval so a retry is not answered with a cached earlier error.
   const key=`sc-payout-${claimed.id}-${new Date(claimed.approved_at||claimed.created_at).getTime()}-a${claimed.attempts}`;
   try{transfer=await stripe.transfers.create(source?{...base,source_transaction:source}:base,{idempotencyKey:source?`${key}-src`:key});}
   catch(err){if(source&&err?.type==='StripeInvalidRequestError')return holdOffStripe(db,claimed,`Stripe wouldn’t fund this from the customer’s card payment: ${friendlyStripeError(err)}`);throw err;}
  }
  const paidAt=nowIso();
  await db.from('engineer_payouts').update({status:'paid',paid_via:'stripe',stripe_transfer_id:transfer.id,stripe_destination:staff.stripe_connect_account_id,paid_at:paidAt,last_error:null,next_attempt_at:null,updated_at:paidAt}).eq('id',claimed.id);
  if(booking)await recordBookingEvent({db,booking,eventType:'engineer_paid',note:`£${(claimed.amount_pence/100).toFixed(2)} to ${name} (${transfer.id})`});
  const to=staff.email||await staffEmail(claimed.engineer_user_id);
  if(to)await sendEmail({to,source:'engineer_payout_paid',...payoutPaidEmail({payout:claimed,booking,engineerName:name})});
  return {id:claimed.id,status:'paid',transferId:transfer.id};
 }catch(err){
  const message=friendlyStripeError(err),delay=retryDelayMinutes(claimed.attempts);
  await db.from('engineer_payouts').update({status:'failed',last_error:message,next_attempt_at:delay==null?null:new Date(Date.now()+delay*60000).toISOString(),updated_at:nowIso()}).eq('id',claimed.id);
  await notifyOwnerOnce(db,claimed,name,message);
  return {id:claimed.id,status:'failed',error:message};
 }
}

/** Runner used by cron and right after a session report. */
export async function processDuePayouts(db,{limit=25}={}){
 const now=nowIso();
 // Recover anything stuck mid-send (crash/timeout). The transfer_group check prevents double payment.
 await db.from('engineer_payouts').update({status:'failed',last_error:'Interrupted while sending — retrying.',next_attempt_at:now,updated_at:now}).eq('status','processing').lt('updated_at',new Date(Date.now()-20*60000).toISOString());
 const {data:due=[]}=await db.from('engineer_payouts').select('id,status,next_attempt_at,attempts').in('status',['pending','failed']).lte('release_after',now).lt('attempts',PAYOUT_MAX_ATTEMPTS).order('release_after').limit(limit*2);
 const ready=(due||[]).filter(p=>p.status==='pending'||(p.next_attempt_at&&p.next_attempt_at<=now)).slice(0,limit);
 const results=[];let stripe=null;
 for(const p of ready){try{stripe=stripe||getStripe();}catch(e){results.push({id:p.id,status:'failed',error:e.message});break;}results.push(await executePayout(db,p.id,{stripe}));}
 return {payoutsChecked:ready.length,payoutsPaid:results.filter(r=>r.status==='paid').length,payoutsFailed:results.filter(r=>r.status==='failed').length};
}

// ---------- owner actions ----------
export async function approvePayout(db,{id,amountPence,ctx}){
 const {data:p}=await db.from('engineer_payouts').select('*').eq('id',id).maybeSingle();
 if(!p)return {ok:false,error:'Payout not found.'};
 if(!['needs_approval','failed','on_hold'].includes(p.status))return {ok:false,error:'This payout is not waiting for approval.'};
 const amount=amountPence==null?p.amount_pence:Math.round(Number(amountPence));
 if(!Number.isFinite(amount)||amount<1||amount>1000000)return {ok:false,error:'Enter an amount between £0.01 and £10,000.'};
 const release=new Date(p.release_after).getTime()>Date.now()?p.release_after:nowIso();
 const {data,error}=await db.from('engineer_payouts').update({status:'pending',amount_pence:amount,approved_by_user_id:ctx?.user?.id||null,approved_at:nowIso(),release_after:release,attempts:0,next_attempt_at:null,last_error:null,owner_alerted_at:null,updated_at:nowIso()}).eq('id',id).eq('status',p.status).select('id').maybeSingle();
 if(error){if(error.code==='23505')return {ok:false,error:'Another payout of this type already exists for this session.'};throw error;}
 if(!data)return {ok:false,error:'Payout changed — refresh and try again.'};
 if(p.session_report_id){const {data:all=[]}=await db.from('engineer_payouts').select('amount_pence,status').eq('session_report_id',p.session_report_id);await db.from('session_reports').update({engineer_fee_pence:(all||[]).filter(x=>x.status!=='cancelled').reduce((n,x)=>n+Number(x.amount_pence||0),0)}).eq('id',p.session_report_id);}
 return {ok:true,result:await executePayout(db,id)};
}

const CLOSABLE=['pending','needs_approval','failed','on_hold'];
/** Before closing a payout by hand, make sure no earlier attempt actually reached Stripe. */
async function stripeAlreadyPaid(db,p,stripe){
 if(!p.attempts&&!p.approved_at)return {paid:false};
 try{
  stripe=stripe||getStripe();
  const list=await stripe.transfers.list({transfer_group:`engineer_payout_${p.id}`,limit:3});
  const t=(list?.data||[]).find(x=>!x.reversed);
  if(!t)return {paid:false};
  await db.from('engineer_payouts').update({status:'paid',paid_via:'stripe',stripe_transfer_id:t.id,stripe_destination:t.destination,paid_at:new Date((t.created||Date.now()/1000)*1000).toISOString(),last_error:null,next_attempt_at:null,updated_at:nowIso()}).eq('id',p.id);
  return {paid:true,transferId:t.id};
 }catch{return {error:true};}
}

export async function cancelPayout(db,{id,stripe=null}){
 const {data:p}=await db.from('engineer_payouts').select('*').eq('id',id).maybeSingle();
 if(!p||!CLOSABLE.includes(p.status))return {ok:false,error:'Only unpaid payouts can be cancelled.'};
 const check=await stripeAlreadyPaid(db,p,stripe);
 if(check.paid)return {ok:false,error:'Stripe had already paid this engineer — it’s now recorded as paid. Don’t pay them again.'};
 if(check.error)return {ok:false,error:'Couldn’t confirm with Stripe that this wasn’t already sent. Try again in a minute.'};
 const {data}=await db.from('engineer_payouts').update({status:'cancelled',next_attempt_at:null,updated_at:nowIso()}).eq('id',id).eq('status',p.status).select('id').maybeSingle();
 return data?{ok:true}:{ok:false,error:'Payout changed — refresh and try again.'};
}

/** You paid the engineer yourself (cash / bank transfer): close it so Stripe can never send it too. */
export async function markPaidOutsideStripe(db,{id,amountPence=null,note='',ctx,stripe=null}){
 const {data:p}=await db.from('engineer_payouts').select('*').eq('id',id).maybeSingle();
 if(!p)return {ok:false,error:'Payout not found.'};
 if(!CLOSABLE.includes(p.status))return {ok:false,error:p.status==='processing'?'Stripe is sending this right now — refresh in a minute.':'This payout is already closed.'};
 const amount=amountPence==null?p.amount_pence:Math.round(Number(amountPence));
 if(!Number.isFinite(amount)||amount<0||amount>1000000)return {ok:false,error:'Enter the amount you paid.'};
 const check=await stripeAlreadyPaid(db,p,stripe);
 if(check.paid)return {ok:false,error:'Stripe had already paid this engineer — it’s now recorded as paid via Stripe. Don’t pay them again.'};
 if(check.error)return {ok:false,error:'Couldn’t confirm with Stripe that this wasn’t already sent. Try again in a minute.'};
 const at=nowIso();
 const {data}=await db.from('engineer_payouts').update({status:'paid',paid_via:'outside_stripe',amount_pence:amount,paid_at:at,paid_outside_note:String(note||'').slice(0,300)||null,marked_paid_by_user_id:ctx?.user?.id||null,next_attempt_at:null,last_error:null,updated_at:at}).eq('id',id).eq('status',p.status).select('id').maybeSingle();
 if(!data)return {ok:false,error:'Payout changed — refresh and try again.'};
 if(p.booking_id){const {data:booking}=await db.from('bookings').select('*').eq('id',p.booking_id).maybeSingle();if(booking)await recordBookingEvent({db,booking,eventType:'engineer_paid_outside_stripe',note:`£${(amount/100).toFixed(2)} to ${p.engineer_name} paid outside Stripe`,ctx});}
 return {ok:true};
}

/** What approved off-Stripe payouts will need from the Stripe balance vs what's there. */
export async function balanceCheck(db,{stripe=null}={}){
 const {data:rows=[]}=await db.from('engineer_payouts').select('amount_pence,status,funding_source,approved_at,release_after').eq('funding_source','off_stripe').not('approved_at','is',null).in('status',['pending','failed','on_hold','processing']);
 const needed=(rows||[]).reduce((n,r)=>n+Number(r.amount_pence||0),0);
 const {data:held=[]}=await db.from('engineer_payouts').select('amount_pence').eq('status','needs_approval');
 let available=null,pending=null;
 try{stripe=stripe||getStripe();const bal=await stripe.balance.retrieve();const gbp=list=>(list||[]).filter(x=>x.currency==='gbp').reduce((n,x)=>n+Number(x.amount||0),0);available=gbp(bal.available);pending=gbp(bal.pending);}catch{}
 return {needed,available,pending,short:available==null?null:Math.max(0,needed-available),waitingForYou:(held||[]).reduce((n,r)=>n+Number(r.amount_pence||0),0),waitingCount:(held||[]).length};
}

/** Cron: at most one low-balance email a day. */
export async function lowBalanceAlert(db,{stripe=null}={}){
 const c=await balanceCheck(db,{stripe});
 if(!c.short)return {lowBalance:false};
 const {data:last}=await db.from('studio_settings').select('value').eq('key','engineer_low_balance_alert_at').maybeSingle();
 if(last?.value&&Date.now()-new Date(last.value).getTime()<20*3600000)return {lowBalance:true,alerted:false};
 await db.from('studio_settings').upsert({key:'engineer_low_balance_alert_at',value:nowIso(),updated_at:nowIso()},{onConflict:'key'});
 const msg=lowBalanceEmail(c);
 for(const to of await ownerEmails())await sendEmail({to,source:'engineer_low_balance',...msg});
 return {lowBalance:true,alerted:true};
}

// ---------- Stripe Connect onboarding ----------
export async function syncConnectAccount(db,account){
 if(!account?.id)return null;
 const transfers=account.capabilities?.transfers==='active';
 const {data:staff}=await db.from('staff_profiles').update({stripe_transfers_active:transfers,stripe_payouts_enabled:Boolean(account.payouts_enabled),stripe_details_submitted:Boolean(account.details_submitted),stripe_connect_updated_at:nowIso()}).eq('stripe_connect_account_id',account.id).select('user_id').maybeSingle();
 if(staff&&transfers){
  await db.from('engineer_payouts').update({status:'pending',last_error:null,next_attempt_at:null,updated_at:nowIso()}).eq('engineer_user_id',staff.user_id).eq('status','on_hold');
 }
 return staff;
}

export async function refreshConnectStatus(db,userId){
 const {data:staff}=await db.from('staff_profiles').select(STAFF_FIELDS).eq('user_id',userId).maybeSingle();
 if(!staff?.stripe_connect_account_id)return staff;
 try{const account=await getStripe().accounts.retrieve(staff.stripe_connect_account_id);await syncConnectAccount(db,account);if(account.capabilities?.transfers==='active')await processDuePayouts(db,{limit:10});}
 catch(e){console.error('Connect status refresh failed',e?.message||e);}
 const {data}=await db.from('staff_profiles').select(STAFF_FIELDS).eq('user_id',userId).maybeSingle();
 return data;
}

export async function onboardingLink(db,ctx){
 const stripe=getStripe();
 let {data:staff}=await db.from('staff_profiles').select(STAFF_FIELDS).eq('user_id',ctx.user.id).maybeSingle();
 if(!staff)throw new Error('Staff profile not found');
 let accountId=staff.stripe_connect_account_id;
 if(!accountId){
  const account=await stripe.accounts.create({type:'express',country:'GB',email:ctx.user.email||staff.email||undefined,business_type:'individual',
   capabilities:{transfers:{requested:true}},business_profile:{product_description:'Freelance audio engineering sessions for Silkcrayon Studio, Cardiff',url:siteUrl()},
   metadata:{silkcrayon_staff_user_id:ctx.user.id}},{idempotencyKey:`sc-connect-${ctx.user.id}-${Math.floor(Date.now()/600000)}`});
  const {data:saved}=await db.from('staff_profiles').update({stripe_connect_account_id:account.id,stripe_connect_updated_at:nowIso()}).eq('user_id',ctx.user.id).is('stripe_connect_account_id',null).select('stripe_connect_account_id').maybeSingle();
  accountId=saved?.stripe_connect_account_id||(await db.from('staff_profiles').select('stripe_connect_account_id').eq('user_id',ctx.user.id).single()).data.stripe_connect_account_id;
 }
 const link=await stripe.accountLinks.create({account:accountId,type:'account_onboarding',refresh_url:`${siteUrl()}/api/engineer/payouts/setup`,return_url:`${siteUrl()}/admin/engineer/payouts?setup=done`});
 return link.url;
}

export async function dashboardLink(db,userId){
 const {data:staff}=await db.from('staff_profiles').select('stripe_connect_account_id,stripe_details_submitted').eq('user_id',userId).maybeSingle();
 if(!staff?.stripe_connect_account_id)return null;
 const link=await getStripe().accounts.createLoginLink(staff.stripe_connect_account_id);
 return link.url;
}

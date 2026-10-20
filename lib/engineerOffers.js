// Engineer session offers: send → accept / decline / expire → next backup → owner alert.
import {newToken,tokenHash} from './customerAuth';
import {sendEmail,ownerEmails,staffEmail,notifyAssignedEngineer} from './notifications';
import {sendSms} from './sms';
import {recordBookingEvent} from './bookingEvents';
import {offerEmail,ownerOfferAlertEmail,siteUrl,prettyDeadline} from './engineerWorkEmails';
import {normaliseOfferSettings,offerDeadline,sessionStartUtc,sessionEndUtc,engineerRateFor,feeFor,substitutionNeedsApproval} from './engineerWorkRules.js';

const OPEN=['queued','sent'];
const ACTIVE_BOOKING=['pending','confirmed'];
const STAFF_FIELDS='user_id,full_name,engineer_name,role,active,phone,email,engineer_pay_hourly_pence,engineer_supported_pay_hourly_pence';
const nowIso=()=>new Date().toISOString();

export async function getEngineerWorkSettings(db){
 try{const {data,error}=await db.from('studio_settings').select('key,value').like('key','engineer_%');if(error)throw error;return normaliseOfferSettings(Object.fromEntries((data||[]).map(x=>[x.key,x.value])));}
 catch{return normaliseOfferSettings({});}
}

async function loadBooking(db,bookingId){
 const {data,error}=await db.from('bookings').select('*,customers(*)').eq('id',bookingId).maybeSingle();
 if(error)throw error;return data;
}

function overlaps(a,b){
 const as=sessionStartUtc(a),ae=sessionEndUtc(a),bs=sessionStartUtc(b),be=sessionEndUtc(b);
 if(!as||!ae||!bs||!be)return false;return as<be&&bs<ae;
}

export async function findClashes(db,booking,engineerUserIds){
 const {data=[]}=await db.from('bookings').select('id,booking_date,start_time,end_time,engineer_user_id,status').in('engineer_user_id',engineerUserIds).in('status',ACTIVE_BOOKING).gte('booking_date',booking.booking_date).lte('booking_date',booking.booking_date).neq('id',booking.id);
 return (data||[]).filter(x=>overlaps(x,booking)).map(x=>x.engineer_user_id);
}

export async function cancelOpenOffers(db,bookingId,reason){
 const {data=[]}=await db.from('engineer_session_offers').update({status:'cancelled',close_reason:reason,updated_at:nowIso()}).eq('booking_id',bookingId).in('status',OPEN).select('id');
 return (data||[]).length;
}

/** Owner picks an engineer plus optional backups, in order. */
export async function createOfferRound(db,{bookingId,engineerUserIds=[],windowHours=null,ctx}){
 const booking=await loadBooking(db,bookingId);
 if(!booking)return {ok:false,status:404,error:'Booking not found.'};
 if(!ACTIVE_BOOKING.includes(booking.status))return {ok:false,status:409,error:'Only upcoming pending or confirmed bookings can be offered.'};
 if(booking.service_slug==='dry-hire')return {ok:false,status:400,error:'Dry hire bookings do not include an engineer.'};
 const ids=[...new Set(engineerUserIds.map(String).filter(Boolean))].slice(0,6);
 if(!ids.length)return {ok:false,status:400,error:'Choose at least one engineer.'};
 const {data:staff=[],error:se}=await db.from('staff_profiles').select(STAFF_FIELDS).in('user_id',ids);
 if(se)throw se;
 const byId=new Map((staff||[]).filter(s=>s.active&&['engineer','owner'].includes(s.role)).map(s=>[s.user_id,s]));
 const missing=ids.filter(id=>!byId.has(id));
 if(missing.length)return {ok:false,status:400,error:'One of the selected engineers is inactive or no longer exists.'};
 const clashes=await findClashes(db,booking,ids);
 if(clashes.length){const names=clashes.map(id=>byId.get(id)?.engineer_name||byId.get(id)?.full_name).filter(Boolean);return {ok:false,status:409,error:`${[...new Set(names)].join(', ')} already ${names.length===1?'has':'have'} a session at this time.`};}
 const settings=await getEngineerWorkSettings(db);
 const override=Number(windowHours)>0?Math.min(168,Number(windowHours)):null;
 const timing=offerDeadline({sessionStart:sessionStartUtc(booking),settings,overrideHours:override});
 if(!timing.ok)return {ok:false,status:409,error:timing.reason==='too_late'?'This session starts too soon for an offer window. Assign an engineer directly instead.':'This session has already started.'};

 await cancelOpenOffers(db,booking.id,'Replaced by a new offer round');
 if(booking.engineer_user_id){
  await db.from('bookings').update({engineer_user_id:null,assigned_engineer:null,engineer_accepted_at:null,engineer_pay_hourly_pence:null,engineer_fee_pence:null,updated_at:nowIso()}).eq('id',booking.id);
  booking.engineer_user_id=null;
 }
 const rows=ids.map((id,i)=>{const s=byId.get(id),rate=engineerRateFor(s,booking);return {
  booking_id:booking.id,engineer_user_id:id,engineer_name:s.engineer_name||s.full_name,position:i+1,status:'queued',
  requires_owner_approval:i>0&&substitutionNeedsApproval(booking,id),window_hours:override,
  pay_hourly_pence:rate,fee_pence:feeFor(rate,booking.duration_minutes),
  booking_date:booking.booking_date,start_time:booking.start_time,end_time:booking.end_time,created_by_user_id:ctx?.user?.id||null
 };});
 const {error:ie}=await db.from('engineer_session_offers').insert(rows);if(ie)throw ie;
 await db.from('bookings').update({engineer_offer_status:'awaiting',engineer_offer_alert_sent_at:null,updated_at:nowIso()}).eq('id',booking.id);
 await recordBookingEvent({db,booking,eventType:'engineer_offer_started',note:`Offer order: ${rows.map(r=>r.engineer_name).join(' → ')}`,ctx});
 const result=await advanceOfferQueue(db,booking.id,{settings});
 return {ok:true,...result};
}

async function alertOwner(db,booking,kind,detail){
 const claim=await db.from('bookings').update({engineer_offer_alert_sent_at:nowIso()}).eq('id',booking.id).is('engineer_offer_alert_sent_at',null).select('id').maybeSingle();
 if(!claim.data)return;
 const msg=ownerOfferAlertEmail({booking,kind,detail});
 for(const to of await ownerEmails())await sendEmail({to,source:`engineer_offer_${kind}`,...msg});
}

async function sendOffer(db,offer,booking,settings){
 const timing=offerDeadline({sessionStart:sessionStartUtc(booking),settings,overrideHours:offer.window_hours});
 if(!timing.ok){
  await db.from('engineer_session_offers').update({status:'cancelled',close_reason:'Too close to the session to offer',updated_at:nowIso()}).eq('id',offer.id).eq('status','queued');
  return {sent:false,tooLate:true};
 }
 const token=newToken();
 const {data:claimed,error}=await db.from('engineer_session_offers').update({status:'sent',token_hash:tokenHash(token),sent_at:nowIso(),expires_at:timing.expiresAt.toISOString(),updated_at:nowIso()}).eq('id',offer.id).eq('status','queued').select('*').maybeSingle();
 if(error){if(error.code==='23505')return {sent:false,raced:true};throw error;}
 if(!claimed)return {sent:false,raced:true};
 const {data:staff}=await db.from('staff_profiles').select(STAFF_FIELDS).eq('user_id',claimed.engineer_user_id).maybeSingle();
 const name=staff?.engineer_name||staff?.full_name||claimed.engineer_name||'there';
 const to=staff?.email||await staffEmail(claimed.engineer_user_id);
 let emailError=null;
 if(to){const r=await sendEmail({to,source:'engineer_session_offer',...offerEmail({booking,offer:claimed,engineerName:name,token})});if(!r.ok)emailError=r.error||'Email failed';}
 else emailError='Engineer has no email address';
 if(staff?.phone){await sendSms({to:staff.phone,source:'engineer_session_offer',body:`Silkcrayon: session offer ${booking.booking_date} ${String(booking.start_time).slice(0,5)} (${Number(booking.duration_minutes)/60}h). Reply by ${prettyDeadline(claimed.expires_at)}: ${siteUrl()}/engineer-offer/${token}`}).catch(()=>null);}
 if(emailError)await db.from('engineer_session_offers').update({email_error:String(emailError).slice(0,300)}).eq('id',claimed.id);
 await db.from('bookings').update({engineer_offer_status:'awaiting',updated_at:nowIso()}).eq('id',booking.id);
 return {sent:true,offerId:claimed.id,engineerName:name,expiresAt:claimed.expires_at,emailError};
}

/** Move the queue forward. Safe to call repeatedly from cron, pages and responses. */
export async function advanceOfferQueue(db,bookingId,{settings=null}={}){
 const booking=await loadBooking(db,bookingId);if(!booking)return {state:'missing'};
 const {data:offers=[]}=await db.from('engineer_session_offers').select('*').eq('booking_id',bookingId).order('position');
 const open=(offers||[]).filter(o=>OPEN.includes(o.status));
 if(!ACTIVE_BOOKING.includes(booking.status)){if(open.length)await cancelOpenOffers(db,bookingId,'Booking no longer active');return {state:'inactive'};}
 if(booking.engineer_user_id&&['accepted','assigned'].includes(booking.engineer_offer_status)){if(open.length)await cancelOpenOffers(db,bookingId,'Engineer already confirmed');return {state:booking.engineer_offer_status};}
 const live=open.find(o=>o.status==='sent');
 if(live){
  if(new Date(live.expires_at).getTime()>Date.now())return {state:'awaiting',offerId:live.id};
  await db.from('engineer_session_offers').update({status:'expired',close_reason:'No response before the deadline',updated_at:nowIso()}).eq('id',live.id).eq('status','sent');
  await recordBookingEvent({db,booking,eventType:'engineer_offer_expired',note:`${live.engineer_name} did not respond in time`});
 }
 settings=settings||await getEngineerWorkSettings(db);
 let queued=open.filter(o=>o.status==='queued').sort((a,b)=>a.position-b.position);
 while(queued.length){
  const next=queued[0];
  if(next.requires_owner_approval&&!next.owner_approved_at){
   await db.from('bookings').update({engineer_offer_status:'needs_owner',updated_at:nowIso()}).eq('id',bookingId);
   await alertOwner(db,booking,'needs_owner',`Next backup: ${next.engineer_name}. Approve in Studio OS to send the offer.`);
   return {state:'needs_owner',nextOfferId:next.id};
  }
  const r=await sendOffer(db,next,booking,settings);
  if(r.sent)return {state:'awaiting',...r};
  if(r.raced)return {state:'awaiting'};
  queued=queued.slice(1);
 }
 await db.from('bookings').update({engineer_offer_status:'unfilled',updated_at:nowIso()}).eq('id',bookingId);
 if((offers||[]).length)await alertOwner(db,booking,'unfilled','');
 return {state:'unfilled'};
}

export async function approveNextBackup(db,{bookingId,offerId=null,ctx}){
 let q=db.from('engineer_session_offers').select('*').eq('booking_id',bookingId).eq('status','queued').order('position').limit(1);
 if(offerId)q=db.from('engineer_session_offers').select('*').eq('id',offerId).eq('booking_id',bookingId).eq('status','queued').limit(1);
 const {data:rows=[]}=await q;const next=(rows||[])[0];
 if(!next)return {ok:false,error:'There is no queued backup to approve.'};
 await db.from('engineer_session_offers').update({owner_approved_at:nowIso(),updated_at:nowIso()}).eq('id',next.id);
 await db.from('bookings').update({engineer_offer_status:'awaiting',engineer_offer_alert_sent_at:null}).eq('id',bookingId);
 const booking=await loadBooking(db,bookingId);
 await recordBookingEvent({db,booking,eventType:'engineer_substitute_approved',note:`Approved ${next.engineer_name}`,ctx});
 return {ok:true,...await advanceOfferQueue(db,bookingId)};
}

export async function stopOffers(db,{bookingId,ctx}){
 const n=await cancelOpenOffers(db,bookingId,'Stopped by the owner');
 const booking=await loadBooking(db,bookingId);
 if(booking&&!booking.engineer_user_id)await db.from('bookings').update({engineer_offer_status:null,updated_at:nowIso()}).eq('id',bookingId);
 if(booking)await recordBookingEvent({db,booking,eventType:'engineer_offers_stopped',note:`${n} open offer${n===1?'':'s'} cancelled`,ctx});
 return {ok:true,cancelled:n};
}

const REASON_COPY={expired:'This offer has expired and has moved on to another engineer.',closed:'This offer is no longer open.',booking_inactive:'This booking has been cancelled or completed.',booking_changed:'The session time changed after this offer was sent. The studio will send a fresh offer if needed.',already_assigned:'Another engineer has already been confirmed for this session.',engineer_inactive:'Your Studio OS account is not active.',not_yours:'This offer belongs to another engineer.',not_found:'Offer not found.'};

export async function respondToOffer(db,{offer,decision,reason='',via='email',ctx=null}){
 if(!offer)return {ok:false,error:REASON_COPY.not_found};
 if(decision==='accept'){
  const {data,error}=await db.rpc('accept_engineer_offer',{p_offer_id:offer.id,p_engineer_user_id:offer.engineer_user_id,p_via:via});
  if(error)throw error;
  if(!data?.ok){
   if(['expired','booking_changed','already_assigned','booking_inactive'].includes(data?.reason))await advanceOfferQueue(db,offer.booking_id);
   return {ok:false,error:REASON_COPY[data?.reason]||REASON_COPY.closed,reason:data?.reason};
  }
  const booking=await loadBooking(db,offer.booking_id);
  await recordBookingEvent({db,booking,eventType:'engineer_accepted',note:`${offer.engineer_name} accepted via ${via}`,ctx});
  await notifyAssignedEngineer(booking,{force:true}).catch(()=>null);
  return {ok:true,status:'accepted'};
 }
 if(decision==='decline'){
  const {data:closed}=await db.from('engineer_session_offers').update({status:'declined',responded_at:nowIso(),response_via:via,decline_reason:String(reason||'').slice(0,300)||null,updated_at:nowIso()}).eq('id',offer.id).eq('status','sent').select('id').maybeSingle();
  if(!closed)return {ok:false,error:offer.status==='sent'?REASON_COPY.closed:REASON_COPY[offer.status]||REASON_COPY.closed};
  const booking=await loadBooking(db,offer.booking_id);
  await recordBookingEvent({db,booking,eventType:'engineer_declined',note:`${offer.engineer_name} declined${reason?`: ${String(reason).slice(0,200)}`:''}`,ctx});
  await advanceOfferQueue(db,offer.booking_id);
  return {ok:true,status:'declined'};
 }
 return {ok:false,error:'Choose accept or decline.'};
}

export async function offerByToken(db,token){
 if(!token||String(token).length<20)return null;
 const {data}=await db.from('engineer_session_offers').select('*').eq('token_hash',tokenHash(String(token))).maybeSingle();
 return data||null;
}

/** Cron: close every overdue offer and move each queue on. */
export async function processDueOffers(db){
 const {data:due=[]}=await db.from('engineer_session_offers').select('booking_id').eq('status','sent').lte('expires_at',nowIso()).limit(200);
 const {data:stuck=[]}=await db.from('bookings').select('id').eq('engineer_offer_status','awaiting').is('engineer_user_id',null).gte('booking_date',new Date(Date.now()-86400000).toISOString().slice(0,10)).limit(200);
 const ids=[...new Set([...(due||[]).map(x=>x.booking_id),...(stuck||[]).map(x=>x.id)])];
 const settings=await getEngineerWorkSettings(db);let advanced=0;
 for(const id of ids){try{await advanceOfferQueue(db,id,{settings});advanced++;}catch(e){console.error('Offer queue failed',id,e?.message||e);}}
 return {offersChecked:ids.length,offersAdvanced:advanced};
}

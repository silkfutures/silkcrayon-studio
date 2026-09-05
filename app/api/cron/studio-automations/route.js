import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {sendLoggedNotification,reminderEmail,bookAgainEmail} from '../../../../lib/notifications';
import {sendLoggedSms} from '../../../../lib/sms';
import {londonDateOffset} from '../../../../lib/time';
import {ensureDryHireIdRequest,DRY_HIRE_ID_BUCKET} from '../../../../lib/dryHireId';

export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return new NextResponse('CRON_SECRET not configured',{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new NextResponse('Unauthorized',{status:401});
 const db=getAdminDb(),tomorrow=londonDateOffset(1),yesterday=londonDateOffset(-1),nowIso=new Date().toISOString();
 const {data:expiredDeliveries=[]}=await db.from('session_deliveries').select('id,storage_path').eq('delivery_type','upload').is('deleted_at',null).not('expires_at','is',null).lte('expires_at',nowIso).limit(200);
 let deliveriesDeleted=0;
 for(const d of expiredDeliveries){
  if(d.storage_path){const {error:removeError}=await db.storage.from('session-deliveries').remove([d.storage_path]);if(removeError)continue;}
  const {error:updateError}=await db.from('session_deliveries').update({deleted_at:nowIso}).eq('id',d.id);if(!updateError)deliveriesDeleted++;
 }
 const {data:expiredIdDocs=[]}=await db.from('dry_hire_id_checks').select('id,status,storage_path').not('storage_path','is',null).is('deleted_at',null).not('document_expires_at','is',null).lte('document_expires_at',nowIso).limit(100);
 let idDocsDeleted=0;
 for(const check of expiredIdDocs){
  const {error:removeError}=await db.storage.from(DRY_HIRE_ID_BUCKET).remove([check.storage_path]);if(removeError)continue;
  const nextStatus=check.status==='submitted'?'expired':check.status;
  const {error:updateError}=await db.from('dry_hire_id_checks').update({storage_path:null,deleted_at:nowIso,status:nextStatus,updated_at:nowIso}).eq('id',check.id);if(!updateError)idDocsDeleted++;
 }
 const preferredDefault=String(process.env.DEFAULT_ENGINEER_USER_ID||'').trim();
 let {data:defaultEngineer}=preferredDefault?await db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email,role,active').eq('user_id',preferredDefault).eq('active',true).maybeSingle():{data:null};
 if(!defaultEngineer){const {data:owner}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email,role,active').eq('role','owner').eq('active',true).limit(1).maybeSingle();defaultEngineer=owner||null;}
 const [{data:upcoming=[]},{data:past=[]}]=await Promise.all([
  db.from('bookings').select('*,customers(*)').eq('booking_date',tomorrow).eq('status','confirmed'),
  db.from('bookings').select('*,customers(*)').eq('booking_date',yesterday).in('status',['confirmed','completed'])
 ]);
 let sent=0;
 for(const b of upcoming){
  const c=b.customers;if(!c)continue;
  let working=b,staff=null;
  if(b.service_slug==='dry-hire'&&!c.dry_hire_id_verified_at){try{await ensureDryHireIdRequest({booking:b,customer:c,resend:true,source:'day_before_reminder'});}catch(e){console.error('Dry Hire ID reminder failed',e?.message||e)}}
  if(b.engineer_user_id){const {data}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email').eq('user_id',b.engineer_user_id).maybeSingle();staff=data||null;}
  else if(b.service_slug!=='dry-hire'&&defaultEngineer){
   const assignedName=defaultEngineer.engineer_name||defaultEngineer.full_name;
   const {data:updated}=await db.from('bookings').update({engineer_user_id:defaultEngineer.user_id,assigned_engineer:assignedName,updated_at:new Date().toISOString()}).eq('id',b.id).is('engineer_user_id',null).select('*,customers(*)').maybeSingle();
   if(updated){working=updated;staff=defaultEngineer;}
  }
  const {count:priorCount}=await db.from('bookings').select('id',{count:'exact',head:true}).eq('customer_id',c.id).lt('booking_date',working.booking_date).in('status',['confirmed','completed']);
  if(c.email){const msg=reminderEmail(working,c,{firstTime:Number(priorCount||0)===0,engineer:staff||null});const r=await sendLoggedNotification({booking:working,customer:c,type:'session_reminder',...msg});if(r.ok)sent++;}
  if(working.sms_reminder_consent&&c.phone){
   const name=staff?.engineer_name||staff?.full_name||'';
   const contact=staff?.phone||'';
   const engineer=name?(contact?` Engineer ${name} — text ${contact} when you reach the lane.`:` Engineer: ${name}.`):'';
   const dry=working.service_slug==='dry-hire'?` Dry hire: no Silkcrayon engineer is included. Bring everything you need to run the session.${c.dry_hire_id_verified_at?' ID verified.':' ID verification is required before access; we have resent the secure ID-check link.'}`:'';
   const sms=await sendLoggedSms({booking:working,customer:c,type:'session_reminder_sms',body:`Silkcrayon reminder: tomorrow at ${String(working.start_time).slice(0,5)}.${dry||engineer} Getting here: https://silkcrayon.com/getting-here`});
   if(sms.ok)sent++;
  }
 }
 for(const b of past){
  const c=b.customers;if(!c?.email)continue;
  const msg=bookAgainEmail(b,c),r=await sendLoggedNotification({booking:b,customer:c,type:'book_again',...msg});if(r.ok)sent++;
 }
 return NextResponse.json({ok:true,tomorrow,yesterday,checked:upcoming.length+past.length,sent,expiredDeliveriesChecked:expiredDeliveries.length,deliveriesDeleted,expiredIdDocsChecked:expiredIdDocs.length,idDocsDeleted});
}
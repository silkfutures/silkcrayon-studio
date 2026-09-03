import {NextResponse} from 'next/server';
import crypto from 'crypto';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {sendEmail,filesReadyEmail} from '../../../../../../lib/notifications';
import {sendSms,normalizePhone} from '../../../../../../lib/sms';
import {recordBookingEvent} from '../../../../../../lib/bookingEvents';

const BUCKET='session-deliveries';
const site=()=>String(process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon.com').replace(/\/$/,'');
const safeName=v=>String(v||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120)||'file';
async function bookingAccess(db,id,ctx){const {data:b,error}=await db.from('bookings').select('*,customers(*)').eq('id',id).single();if(error||!b)throw new Error('Booking not found.');if(ctx.profile.role==='engineer'&&b.engineer_user_id&&b.engineer_user_id!==ctx.user.id)throw new Error('This session is assigned to another engineer.');return b}

async function createDeliveryLog(db,{delivery,booking,customer,type,recipient,subject,channel}){
 const {data,error}=await db.from('notification_log').insert({booking_id:booking.id,customer_id:customer?.id||booking.customer_id,session_delivery_id:delivery.id,notification_type:type,recipient,subject,status:'queued',channel}).select('id').single();
 if(error)throw error;return data.id;
}
async function finishDeliveryLog(db,id,result){
 await db.from('notification_log').update({status:result.ok?'sent':result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',id);
}

export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx)return NextResponse.json({error:'Staff access required.'},{status:403});const {id}=await params,db=getAdminDb(),body=await req.json(),b=await bookingAccess(db,id,ctx),c=b.customers;
  if(body.action==='prepare_upload'){
   const fileName=safeName(body.fileName),path=`${b.customer_id}/${b.id}/${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${fileName}`;
   const {data,error}=await db.storage.from(BUCKET).createSignedUploadUrl(path);if(error)throw error;
   return NextResponse.json({bucket:BUCKET,path:data.path||path,token:data.token});
  }
  let externalUrl=null,storagePath=null,fileName=null;
  if(body.action==='deliver_link'){try{const u=new URL(String(body.externalUrl||''));if(!['http:','https:'].includes(u.protocol))throw new Error();externalUrl=u.toString()}catch{return NextResponse.json({error:'Paste a valid https:// file link.'},{status:400})}}
  else if(body.action==='deliver_upload'){storagePath=String(body.storagePath||'');fileName=safeName(body.fileName);if(!storagePath.startsWith(`${b.customer_id}/${b.id}/`))return NextResponse.json({error:'Invalid upload path.'},{status:400})}
  else return NextResponse.json({error:'Invalid delivery action.'},{status:400});
  const token=crypto.randomUUID(),expiresAt=storagePath?new Date(Date.now()+30*24*60*60*1000).toISOString():null;
  const {data:delivery,error:de}=await db.from('session_deliveries').insert({booking_id:b.id,customer_id:b.customer_id,created_by_user_id:ctx.user.id,delivery_type:externalUrl?'link':'upload',external_url:externalUrl,storage_path:storagePath,file_name:fileName,share_token:token,expires_at:expiresAt}).select().single();if(de)throw de;
  const href=`${site()}/files/${token}`,msg=filesReadyEmail(b,c,{href,expiresAt});let emailSent=false,smsSent=false,emailError=null,smsError=null;
  if(c?.email){
   let logId=null;try{logId=await createDeliveryLog(db,{delivery,booking:b,customer:c,type:'files_ready_email',recipient:c.email,subject:msg.subject,channel:'email'});const er=await sendEmail({to:c.email,...msg});emailSent=Boolean(er.ok);emailError=er.error||null;await finishDeliveryLog(db,logId,er)}catch(e){emailError=e.message||String(e);if(logId)await finishDeliveryLog(db,logId,{ok:false,error:emailError})}
  }
  if(c?.phone){
   const recipient=normalizePhone(c.phone)||String(c.phone),expiry=expiresAt?' Uploaded files stay available for 30 days.':'';const body=`Silkcrayon: your files are ready 🎧 ${href}.${expiry} Ready for the next one? Book again: ${site()}/booking`;
   let logId=null;try{logId=await createDeliveryLog(db,{delivery,booking:b,customer:c,type:'files_ready_sms',recipient,subject:body.slice(0,80),channel:'sms'});const sr=await sendSms({to:c.phone,body});smsSent=Boolean(sr.ok);smsError=sr.error||null;await finishDeliveryLog(db,logId,sr)}catch(e){smsError=e.message||String(e);if(logId)await finishDeliveryLog(db,logId,{ok:false,error:smsError})}
  }
  await recordBookingEvent({db,booking:b,eventType:'files_delivered',reasonCode:externalUrl?'link':'upload',note:`Files ready notification${emailSent?' · email sent':emailError?' · email failed':''}${smsSent?' · SMS sent':smsError?' · SMS failed':''}`,ctx,snapshot:b});
  return NextResponse.json({ok:true,id:delivery.id,href,emailSent,smsSent,emailError,smsError});
 }catch(e){return NextResponse.json({error:e.message||'Could not deliver files.'},{status:500})}
}

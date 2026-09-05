import crypto from 'crypto';
import {getAdminDb} from './supabase';
import {sendEmail} from './notifications';
import {sendSms} from './sms';
import {recordBookingEvent} from './bookingEvents';
import {formatUkDate} from './dates';

export const DRY_HIRE_ID_BUCKET='dry-hire-id';
export const DRY_HIRE_ID_MAX_BYTES=8*1024*1024;
export const DRY_HIRE_ID_ALLOWED_MIME=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);

export function canonicalSiteUrl(){
 const configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');
 if(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))return 'https://silkcrayon.com';
 return configured;
}
export function idToken(){return crypto.randomBytes(32).toString('base64url')}
export function idTokenHash(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex')}
export function safeUploadName(v='id-photo'){
 const clean=String(v||'id-photo').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-100);
 return clean||'id-photo';
}
export function docTypeLabel(type){return type==='passport'?'Passport':'Driving licence'}

function requestEmailHtml(customer,booking,href){
 const name=String(customer?.artist_name||customer?.full_name||'there').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
 return `<!doctype html><html><body style="margin:0;background:#08070a;color:#f7f3fa;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:42px 22px"><div style="color:#C394FF;font-size:12px;letter-spacing:3px;font-weight:700">SILKCRAYON STUDIO · DRY HIRE</div><h1 style="font-size:34px;line-height:1.05;margin:18px 0">Complete your ID check.</h1><div style="color:#c8c1cc;font-size:16px;line-height:1.7"><p>Hi ${name}, your dry-hire booking is in the diary for <b>${formatUkDate(booking.booking_date)}</b> at <b>${String(booking.start_time).slice(0,5)}</b>.</p><p>Because dry hire is self-operated, the lead hirer must be 18+ and have photo ID verified before studio access.</p><p>Upload a clear photo of either a <b>driving licence</b> or <b>passport</b>. The upload is private, available only to Silkcrayon owners for verification, and is deleted as soon as it is verified (or automatically within 7 days if it is not reviewed).</p></div><p style="margin-top:30px"><a href="${href}" style="background:#C394FF;color:#0b0710;padding:14px 20px;text-decoration:none;font-weight:800;display:inline-block">COMPLETE ID CHECK →</a></p><p style="border-top:1px solid #302b35;margin-top:36px;padding-top:20px;color:#8f8894;font-size:12px">This secure link is for the lead hirer only. Do not forward it.</p></div></body></html>`;
}

export async function ensureDryHireIdRequest({booking,customer,resend=false,ctx=null,source='booking'}={}){
 if(!booking||booking.service_slug!=='dry-hire'||!customer)return {ok:true,skipped:true,reason:'not_dry_hire'};
 if(!['pending','confirmed'].includes(String(booking.status||'')))return {ok:true,skipped:true,reason:'booking_not_active'};
 const db=getAdminDb();
 const verifiedAt=customer.dry_hire_id_verified_at;
 if(verifiedAt){
  return {ok:true,skipped:true,verified:true,verifiedAt};
 }
 let {data:existing}=await db.from('dry_hire_id_checks').select('*').eq('booking_id',booking.id).order('requested_at',{ascending:false}).limit(1).maybeSingle();
 if(existing&&existing.status==='submitted'&&new Date(existing.expires_at).getTime()>Date.now()){
  return {ok:true,skipped:true,status:'submitted',checkId:existing.id};
 }
 if(existing&&!resend&&existing.status==='requested'&&new Date(existing.expires_at).getTime()>Date.now()){
  return {ok:true,skipped:true,status:'requested',checkId:existing.id};
 }
 const token=idToken(),hash=idTokenHash(token),expiresAt=new Date(Date.now()+14*24*60*60*1000).toISOString();
 let check;
 if(existing&&existing.status!=='verified'){
  const patch={status:'requested',token_hash:hash,requested_at:new Date().toISOString(),expires_at:expiresAt,request_count:Number(existing.request_count||0)+1,request_email_error:null,request_sms_error:null,updated_at:new Date().toISOString()};
  // Never rotate a request while an old ID object could be left orphaned in storage.
  if(existing.storage_path&&!existing.deleted_at){const removed=await deleteIdDocument(db,existing);if(!removed.ok)throw new Error('Could not securely remove the previous ID upload before issuing a new request.');}
  Object.assign(patch,{storage_path:null,original_file_name:null,mime_type:null,size_bytes:null,submitted_at:null,document_expires_at:null,deleted_at:existing.storage_path?new Date().toISOString():existing.deleted_at||null,rejected_at:null,rejection_reason:null});
  const {data,error}=await db.from('dry_hire_id_checks').update(patch).eq('id',existing.id).select().single();if(error)throw error;check=data;
 }else{
  const {data,error}=await db.from('dry_hire_id_checks').insert({booking_id:booking.id,customer_id:customer.id,token_hash:hash,expires_at:expiresAt,status:'requested'}).select().single();if(error)throw error;check=data;
 }
 const href=`${canonicalSiteUrl()}/dry-hire-id/${encodeURIComponent(token)}`;
 let emailResult={ok:false,skipped:true},smsResult={ok:false,skipped:true};
 if(customer.email)emailResult=await sendEmail({to:customer.email,subject:'Silkcrayon Dry Hire — complete your ID check',html:requestEmailHtml(customer,booking,href)});
 if(customer.phone)smsResult=await sendSms({to:customer.phone,body:`Silkcrayon Dry Hire: your studio is booked for ${formatUkDate(booking.booking_date)} at ${String(booking.start_time).slice(0,5)}. The lead hirer must complete a quick 18+ photo-ID check before access: ${href}`});
 const now=new Date().toISOString();
 await db.from('dry_hire_id_checks').update({
  request_email_sent_at:emailResult.ok?now:null,
  request_sms_sent_at:smsResult.ok?now:null,
  request_email_error:emailResult.ok||emailResult.skipped?null:(emailResult.error||'Email failed'),
  request_sms_error:smsResult.ok||smsResult.skipped?null:(smsResult.error||'SMS failed'),
  updated_at:now
 }).eq('id',check.id);
 await recordBookingEvent({db,booking,eventType:'dry_hire_id_requested',reasonCode:source,note:`ID check requested${emailResult.ok?' · email sent':''}${smsResult.ok?' · SMS sent':''}`,ctx,snapshot:{check_id:check.id,status:'requested'}});
 return {ok:true,checkId:check.id,href,emailSent:Boolean(emailResult.ok),smsSent:Boolean(smsResult.ok)};
}

export async function deleteIdDocument(db,check){
 if(!check?.storage_path||check.deleted_at)return {ok:true,skipped:true};
 const {error}=await db.storage.from(DRY_HIRE_ID_BUCKET).remove([check.storage_path]);
 if(error)return {ok:false,error:error.message||String(error)};
 const deletedAt=new Date().toISOString();
 const {error:updateError}=await db.from('dry_hire_id_checks').update({deleted_at:deletedAt,storage_path:null,original_file_name:null,mime_type:null,size_bytes:null,updated_at:deletedAt}).eq('id',check.id);
 if(updateError)return {ok:false,error:updateError.message||String(updateError)};
 return {ok:true,deletedAt};
}


export async function closeDryHireIdCheck(db,booking){
 if(!db||booking?.service_slug!=='dry-hire')return {ok:true,skipped:true};
 try{
  const {data:check,error}=await db.from('dry_hire_id_checks').select('*').eq('booking_id',booking.id).order('requested_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(!check||check.status==='verified')return {ok:true,skipped:true};
  const now=new Date().toISOString();let deleted=true,deleteError=null;
  if(check.storage_path&&!check.deleted_at){const result=await deleteIdDocument(db,check);deleted=Boolean(result.ok);deleteError=result.error||null;}
  const patch={status:'expired',expires_at:now,document_expires_at:deleted?null:now,updated_at:now};
  const {error:updateError}=await db.from('dry_hire_id_checks').update(patch).eq('id',check.id);if(updateError)throw updateError;
  return {ok:deleted,checkId:check.id,photoDeleted:deleted,error:deleteError};
 }catch(e){return {ok:false,error:e?.message||String(e)}}
}

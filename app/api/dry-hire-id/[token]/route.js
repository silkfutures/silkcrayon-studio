import {NextResponse} from 'next/server';
import crypto from 'crypto';
import {getAdminDb} from '../../../../lib/supabase';
import {rateLimit} from '../../../../lib/rateLimit';
import {DRY_HIRE_ID_BUCKET,DRY_HIRE_ID_ALLOWED_MIME,DRY_HIRE_ID_MAX_BYTES,idTokenHash,safeUploadName,canonicalSiteUrl} from '../../../../lib/dryHireId';
import {ownerEmails,sendEmail} from '../../../../lib/notifications';
import {recordBookingEvent} from '../../../../lib/bookingEvents';

const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, max-age=0'}});
function extFor(type){return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif'})[type]||'jpg'}
async function lookup(db,token){const hash=idTokenHash(token);const {data}=await db.from('dry_hire_id_checks').select('*,bookings(*),customers(*)').eq('token_hash',hash).maybeSingle();return data}

export async function POST(req,{params}){
 try{
  const {token}=await params;
  if(!token||token.length<32)return json({error:'Invalid ID-check link.'},400);
  if(!await rateLimit(req,{scope:'dry-hire-id',limit:20,windowSeconds:900,identity:idTokenHash(token)}))return json({error:'Too many attempts. Please wait and try again.'},429);
  const body=await req.json(),db=getAdminDb(),check=await lookup(db,token);
  if(!check)return json({error:'This ID-check link is not valid.'},404);
  if(new Date(check.expires_at).getTime()<Date.now())return json({error:'This ID-check link has expired. Ask Silkcrayon to resend it.'},410);
  if(check.customers?.dry_hire_id_verified_at)return json({error:'ID is already verified.'},409);
  if(check.status==='verified')return json({error:'This ID-check link is no longer active. Please use the newest link Silkcrayon sent you.'},410);
  if(check.bookings?.service_slug!=='dry-hire')return json({error:'This ID check is not attached to a Dry Hire booking.'},400);
  if(!['pending','confirmed'].includes(String(check.bookings?.status||'')))return json({error:'This Dry Hire booking is no longer active, so this ID-check link has been closed.'},410);
  if(body.action==='prepare_upload'){
   if(check.status==='submitted')return json({error:'Your ID has already been submitted and is waiting for review.'},409);
   const documentType=String(body.documentType||'');
   if(!['driving_licence','passport'].includes(documentType))return json({error:'Choose driving licence or passport.'},400);
   if(body.ageConfirmed!==true)return json({error:'You must confirm that the lead hirer is 18 or over.'},400);
   const mimeType=String(body.mimeType||'').toLowerCase(),sizeBytes=Number(body.sizeBytes||0);
   if(!DRY_HIRE_ID_ALLOWED_MIME.has(mimeType))return json({error:'Use a JPG, PNG, WebP or HEIC photo.'},400);
   if(!Number.isInteger(sizeBytes)||sizeBytes<1||sizeBytes>DRY_HIRE_ID_MAX_BYTES)return json({error:'ID photo must be no larger than 8 MB.'},400);
   if(check.storage_path&&!check.deleted_at){const {error:oldDeleteError}=await db.storage.from(DRY_HIRE_ID_BUCKET).remove([check.storage_path]);if(oldDeleteError)return json({error:'Could not securely replace the previous upload. Please try again.'},500);}
   const path=`${check.customer_id}/${check.id}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extFor(mimeType)}`;
   const {data:signed,error:se}=await db.storage.from(DRY_HIRE_ID_BUCKET).createSignedUploadUrl(path);if(se||!signed?.token)throw se||new Error('Could not create secure upload.');
   const now=new Date().toISOString(),cleanupAt=new Date(Date.now()+24*60*60*1000).toISOString();
   const {error:ue}=await db.from('dry_hire_id_checks').update({status:'requested',document_type:documentType,storage_path:path,original_file_name:safeUploadName(body.fileName),mime_type:mimeType,size_bytes:sizeBytes,age_18_confirmed_at:now,document_expires_at:cleanupAt,deleted_at:null,updated_at:now}).eq('id',check.id);if(ue)throw ue;
   return json({bucket:DRY_HIRE_ID_BUCKET,path:signed.path||path,uploadToken:signed.token});
  }
  if(body.action==='submit_upload'){
   if(!check.storage_path||!check.age_18_confirmed_at||!check.document_type)return json({error:'Prepare and upload the ID photo first.'},400);
   const parts=check.storage_path.split('/'),name=parts.pop(),folder=parts.join('/');
   const {data:objects,error:le}=await db.storage.from(DRY_HIRE_ID_BUCKET).list(folder,{search:name,limit:10});if(le)throw le;
   if(!(objects||[]).some(x=>x.name===name))return json({error:'The uploaded photo could not be found. Please upload it again.'},400);
   const now=new Date().toISOString(),deleteBy=new Date(Date.now()+7*24*60*60*1000).toISOString();
   const {data:submitted,error:ue}=await db.from('dry_hire_id_checks').update({status:'submitted',submitted_at:now,document_expires_at:deleteBy,rejected_at:null,rejection_reason:null,updated_at:now}).eq('id',check.id).select('id,booking_id').single();if(ue)throw ue;
   await recordBookingEvent({db,booking:check.bookings,eventType:'dry_hire_id_submitted',reasonCode:'secure_upload',note:'Lead hirer submitted photo ID for owner review.',snapshot:{check_id:check.id,document_type:check.document_type}});
   const owners=await ownerEmails();const adminHref=`${canonicalSiteUrl()}/admin/engineer/session/${check.booking_id}`;
   for(const email of owners){await sendEmail({to:email,subject:`Dry Hire ID submitted — ${check.customers?.artist_name||check.customers?.full_name||'customer'}`,html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto"><p style="color:#C394FF;letter-spacing:3px">SILKCRAYON · DRY HIRE</p><h1>ID ready to review.</h1><p>${check.customers?.artist_name||check.customers?.full_name||'The lead hirer'} has submitted photo ID for ${check.bookings?.booking_date} at ${String(check.bookings?.start_time||'').slice(0,5)}.</p><p><a style="background:#C394FF;color:#08070a;padding:14px 18px;text-decoration:none;font-weight:800" href="${adminHref}">REVIEW IN STUDIO OS →</a></p></div></div>`}).catch(()=>{});}
   return json({ok:true,id:submitted.id});
  }
  return json({error:'Invalid action.'},400);
 }catch(e){return json({error:e?.message||'Could not process ID check.'},500)}
}

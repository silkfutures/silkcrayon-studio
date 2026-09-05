import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {ensureDryHireIdRequest,deleteIdDocument,idTokenHash,idToken,docTypeLabel} from '../../../../../../lib/dryHireId';
import {sendEmail} from '../../../../../../lib/notifications';
import {sendSms} from '../../../../../../lib/sms';
import {recordBookingEvent} from '../../../../../../lib/bookingEvents';

async function notifyVerified(customer,method){
 const detail=method==='in_person'?'checked in person':'secure upload reviewed';
 if(customer?.email)await sendEmail({to:customer.email,subject:'Silkcrayon Dry Hire — ID verified',html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto"><p style="color:#C394FF;letter-spacing:3px">SILKCRAYON · DRY HIRE</p><h1>ID verified ✓</h1><p>Your lead-hirer ID has been ${detail}. You’re all set for your Silkcrayon dry hire.</p><p style="color:#9d96a2">We keep the verification record, not the ID image.</p></div></div>`}).catch(()=>{});
 if(customer?.phone)await sendSms({to:customer.phone,body:'Silkcrayon Dry Hire: ID verified ✓ You’re all set for your booking. We keep the verification record, not the ID photo.'}).catch(()=>{});
}

export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,db=getAdminDb(),body=await req.json();
  const {data:booking,error:be}=await db.from('bookings').select('*,customers(*)').eq('id',id).single();if(be||!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(booking.service_slug!=='dry-hire')return NextResponse.json({error:'ID verification only applies to Dry Hire bookings.'},{status:400});
  if(!['pending','confirmed'].includes(String(booking.status||'')))return NextResponse.json({error:'This Dry Hire booking is no longer active.'},{status:409});
  const customer=booking.customers;
  const {data:check}=await db.from('dry_hire_id_checks').select('*').eq('booking_id',id).order('requested_at',{ascending:false}).limit(1).maybeSingle();
  if(body.action==='request'){
   if(customer?.dry_hire_id_verified_at)return NextResponse.json({error:'This customer is already ID verified. Use Request new ID if you need to re-verify.'},{status:409});
   const result=await ensureDryHireIdRequest({booking,customer,resend:true,ctx,source:'owner_resend'});return NextResponse.json(result);
  }
  if(body.action==='reset_and_request'){
   if(check?.storage_path&&!check.deleted_at){const del=await deleteIdDocument(db,check);if(!del.ok)return NextResponse.json({error:'Could not delete the old ID photo. Verification was not reset.'},{status:500})}
   await db.from('customers').update({dry_hire_id_verified_at:null,dry_hire_id_verified_by:null,dry_hire_id_verified_method:null,dry_hire_id_document_type:null,updated_at:new Date().toISOString()}).eq('id',customer.id);
   const refreshed={...customer,dry_hire_id_verified_at:null};
   await recordBookingEvent({db,booking,eventType:'dry_hire_id_verification_reset',reasonCode:'owner_request',note:'Owner requested fresh lead-hirer ID verification.',ctx,snapshot:{customer_id:customer.id}});
   const result=await ensureDryHireIdRequest({booking,customer:refreshed,resend:true,ctx,source:'owner_reverify'});return NextResponse.json(result);
  }
  if(body.action==='reject'){
   if(!check||check.status!=='submitted')return NextResponse.json({error:'There is no submitted ID to reject.'},{status:409});
   const del=await deleteIdDocument(db,check);if(!del.ok)return NextResponse.json({error:'Could not securely delete the rejected ID photo. Try again.'},{status:500});
   const now=new Date().toISOString(),reason=String(body.reason||'ID could not be verified.').slice(0,500);
   await db.from('dry_hire_id_checks').update({status:'rejected',rejected_at:now,rejection_reason:reason,updated_at:now}).eq('id',check.id);
   await recordBookingEvent({db,booking,eventType:'dry_hire_id_rejected',reasonCode:'owner_review',note:reason,ctx,snapshot:{check_id:check.id}});
   const result=await ensureDryHireIdRequest({booking,customer,resend:true,ctx,source:'rejected_resubmission'});return NextResponse.json(result);
  }
  if(body.action==='verify'){
   if(!check||check.status!=='submitted'||!check.storage_path)return NextResponse.json({error:'A submitted ID photo is required before upload verification.'},{status:409});
   const del=await deleteIdDocument(db,check);if(!del.ok)return NextResponse.json({error:'The ID photo could not be deleted, so verification was not completed. Try again.'},{status:500});
   const now=new Date().toISOString();
   const {error:ce}=await db.from('customers').update({dry_hire_id_verified_at:now,dry_hire_id_verified_by:ctx.user.id,dry_hire_id_verified_method:'upload',dry_hire_id_document_type:check.document_type,updated_at:now}).eq('id',customer.id);if(ce)throw ce;
   const {error:ue}=await db.from('dry_hire_id_checks').update({status:'verified',verified_at:now,verified_by_user_id:ctx.user.id,verification_method:'upload',updated_at:now}).eq('id',check.id);if(ue)throw ue;
   await recordBookingEvent({db,booking,eventType:'dry_hire_id_verified',reasonCode:'secure_upload',note:`${docTypeLabel(check.document_type)} verified; uploaded image deleted.`,ctx,snapshot:{check_id:check.id,document_type:check.document_type,photo_retained:false}});
   await notifyVerified(customer,'upload');return NextResponse.json({ok:true,verifiedAt:now});
  }
  if(body.action==='mark_in_person'){
   if(check?.storage_path&&!check.deleted_at){const del=await deleteIdDocument(db,check);if(!del.ok)return NextResponse.json({error:'An uploaded ID photo exists and could not be deleted. Try again before marking verified.'},{status:500})}
   const now=new Date().toISOString();
   const {error:ce}=await db.from('customers').update({dry_hire_id_verified_at:now,dry_hire_id_verified_by:ctx.user.id,dry_hire_id_verified_method:'in_person',dry_hire_id_document_type:null,updated_at:now}).eq('id',customer.id);if(ce)throw ce;
   if(check){await db.from('dry_hire_id_checks').update({status:'verified',verified_at:now,verified_by_user_id:ctx.user.id,verification_method:'in_person',updated_at:now}).eq('id',check.id)}
   else {const token=idToken();await db.from('dry_hire_id_checks').insert({booking_id:id,customer_id:customer.id,status:'verified',token_hash:idTokenHash(token),expires_at:now,verified_at:now,verified_by_user_id:ctx.user.id,verification_method:'in_person'})}
   await recordBookingEvent({db,booking,eventType:'dry_hire_id_verified',reasonCode:'in_person',note:'Lead hirer photo ID checked in person; no ID image retained.',ctx,snapshot:{customer_id:customer.id,photo_retained:false}});
   await notifyVerified(customer,'in_person');return NextResponse.json({ok:true,verifiedAt:now});
  }
  return NextResponse.json({error:'Invalid ID action.'},{status:400});
 }catch(e){return NextResponse.json({error:e?.message||'Could not update ID check.'},{status:500})}
}

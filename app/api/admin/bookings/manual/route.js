import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../../lib/supabase';
import {getStaffContext} from '../../../../../lib/auth';
import {getStripe} from '../../../../../lib/stripe';
import {confirmationEmail,engineerAssignedEmail,sendLoggedNotification,sendStaffLoggedNotification} from '../../../../../lib/notifications';
import {sendLoggedSms} from '../../../../../lib/sms';
import {newToken,tokenHash} from '../../../../../lib/customerAuth';
import {londonDateTimeToUtc} from '../../../../../lib/time';
import {formatUkDate} from '../../../../../lib/dates';
import {ensureDryHireIdRequest} from '../../../../../lib/dryHireId';
import {recordBookingEvent} from '../../../../../lib/bookingEvents';

function money(v){return Math.round(Number(v||0)*100)}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function canonicalBase(origin=''){
 const configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');
 if(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))return 'https://silkcrayon.com';
 return configured||origin;
}
export async function POST(req){try{
 const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const b=await req.json(),db=getAdminDb();
 if(!b.customerId||!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')||!/^\d{2}:\d{2}$/.test(b.start||'')||!/^\d{2}:\d{2}$/.test(b.end||''))return NextResponse.json({error:'Artist, date and time are required.'},{status:400});
 const projectId=String(b.projectId||'').trim()||null;
 let project=null;
 if(projectId){const {data:p,error:pe}=await db.from('studio_projects').select('id,title,customer_id,status,project_type,recording_hours_included,recording_hours_used').eq('id',projectId).maybeSingle();if(pe)throw pe;if(!p)return NextResponse.json({error:'Project not found.'},{status:404});if(['lost','delivered'].includes(p.status))return NextResponse.json({error:'This project is closed.'},{status:409});if(p.customer_id&&p.customer_id!==b.customerId)return NextResponse.json({error:'This booking must use the customer linked to the project.'},{status:400});project=p;}
 const serviceSlug=project?'podcast-recording':b.serviceSlug==='dry-hire'?'dry-hire':'vocal-recording',dryHire=serviceSlug==='dry-hire';
 const hours=Number(b.hours||0),duration=Math.round(hours*60),amount=money(b.amount);
 if(!Number.isFinite(hours)||hours<(dryHire?2:.5)||hours>8||duration<(dryHire?120:30))return NextResponse.json({error:dryHire?'Dry Hire has a 2-hour minimum.':'Choose between 0.5 and 8 hours.'},{status:400});
 if(dryHire&&!b.dryHireConfirmed)return NextResponse.json({error:'Confirm the lead hirer is 18+ and has agreed the Dry Hire Terms.'},{status:400});
 if(!project&&(!Number.isFinite(amount)||amount<30))return NextResponse.json({error:'Session value must be at least £0.30.'},{status:400});
 const when=londonDateTimeToUtc(b.date,b.start);if(!when||when.getTime()<=Date.now())return NextResponse.json({error:'Choose a future session.'},{status:400});
 const {data:customer,error:ce}=await db.from('customers').select('*').eq('id',b.customerId).single();if(ce||!customer)return NextResponse.json({error:'Artist not found.'},{status:404});
 if(dryHire&&!customer.phone)return NextResponse.json({error:'Add a mobile number to the artist before creating a Dry Hire booking.'},{status:400});
 let engineer=null;
 if(!dryHire&&b.engineerUserId){const {data:e}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,email,phone,photo_url,active,role').eq('user_id',b.engineerUserId).maybeSingle();if(e?.active)engineer=e}
 const {data:id,error:re}=await db.rpc('reserve_booking',{
  p_customer_id:customer.id,p_service_slug:serviceSlug,p_service_name:project?'Podcast Recording':dryHire?'Studio Dry Hire':'Vocal Recording',
  p_booking_date:b.date,p_start_time:b.start,p_end_time:b.end,p_duration_minutes:duration,
  p_genre:null,p_notes:String(b.notes||'').slice(0,2000)||null,p_amount_pence:amount,p_hold_expires_at:null,
  p_harmful_music_policy_accepted:true
 });
 if(re){if(String(re.message).includes('slot_unavailable'))return NextResponse.json({error:'That time overlaps another booking or blockout.'},{status:409});throw re}
 const policyVersion='2026-08-14',paymentMode=project?'project_included':String(b.paymentMode||'unpaid');
 const isManualPaid=project||paymentMode==='manual_paid';
 const {error:ue}=await db.from('bookings').update({
  status:'confirmed',payment_status:isManualPaid?'paid':'unpaid',payment_method:isManualPaid?'manual':'stripe',hold_expires_at:null,project_id:project?.id||null,
  dry_hire_terms_accepted:dryHire,dry_hire_terms_version:dryHire?'2026-09-05':null,dry_hire_lead_hirer_18_confirmed:dryHire,
  assigned_engineer:engineer?(engineer.engineer_name||engineer.full_name):null,engineer_user_id:engineer?.user_id||null,
  terms_version:policyVersion,cancellation_policy_version:policyVersion,harmful_music_policy_version:policyVersion,privacy_policy_version:policyVersion,
  policy_accepted_at:new Date().toISOString(),harmful_music_policy_accepted:true,sms_reminder_consent:Boolean(customer.phone),
  internal_notes:`Admin-created booking by ${ctx.profile.full_name}${project?` · Included in project: ${project.title}`:''}${b.notes?` · ${String(b.notes).slice(0,500)}`:''}`,updated_at:new Date().toISOString()
 }).eq('id',id);if(ue)throw ue;
 const {data:booking}=await db.from('bookings').select('*,customers(*)').eq('id',id).single();

 let portalUrl=null;try{const token=newToken(),expires=new Date(Date.now()+7*24*60*60*1000).toISOString();const {error:te}=await db.from('customer_access_tokens').insert({customer_id:customer.id,token_hash:tokenHash(token),expires_at:expires});if(!te)portalUrl=`${canonicalBase(new URL(req.url).origin)}/account/access?token=${encodeURIComponent(token)}`;}catch{}
 const {count}=await db.from('bookings').select('id',{count:'exact',head:true}).eq('customer_id',customer.id).in('status',['confirmed','completed']);
 const paymentLabel=project?'Included in your project recording quote':isManualPaid?`£${(amount/100).toFixed(2)} · Paid manually`:`£${(amount/100).toFixed(2)} · Payment due`;
 const msg=confirmationEmail(booking,customer,{firstTime:(count||0)<=1,paymentLabel,portalUrl,engineer});
 await sendLoggedNotification({booking,customer,type:'admin_booking_confirmation',...msg});
 if(customer.phone)await sendLoggedSms({booking,customer,type:'admin_booking_confirmation_sms',body:project?`Silkcrayon: your podcast recording session is booked for ${formatUkDate(booking.booking_date)} at ${String(booking.start_time).slice(0,5)}–${String(booking.end_time).slice(0,5)}. This session is included in your project recording quote; editing/mixing is billed separately if agreed.`:dryHire?`Silkcrayon: your Dry Hire is booked for ${formatUkDate(booking.booking_date)} at ${String(booking.start_time).slice(0,5)}–${String(booking.end_time).slice(0,5)}. No Silkcrayon engineer is included. If ID verification is still needed, a secure ID-check link will follow.`:`Silkcrayon: you're booked for ${formatUkDate(booking.booking_date)} at ${String(booking.start_time).slice(0,5)}–${String(booking.end_time).slice(0,5)}. ${paymentLabel}. ${portalUrl||''}`});
 let idRequestWarning=null,idRequestSent=false;
 if(dryHire){
  try{const idResult=await ensureDryHireIdRequest({booking,customer,ctx,source:'manual_booking'});idRequestSent=Boolean(idResult?.emailSent||idResult?.smsSent||idResult?.verified||idResult?.status==='requested'||idResult?.status==='submitted');}
  catch(idError){
   idRequestWarning='Booking created, but the automatic ID request could not be sent. Open the booking and press Request ID.';
   console.error('Dry Hire ID request failed after manual booking',idError?.message||idError);
   try{await recordBookingEvent({db,booking,eventType:'dry_hire_id_request_failed',reasonCode:'manual_booking',note:String(idError?.message||idError).slice(0,500),ctx,snapshot:{customer_id:customer.id}})}catch{}
  }
 }
 if(engineer?.email){const em=engineerAssignedEmail(booking,customer,engineer.engineer_name||engineer.full_name);await sendStaffLoggedNotification({booking,type:'engineer_assignment',to:engineer.email,...em})}

 let paymentUrl=null;
 if(!project&&['pay_by_bank','card_or_bank'].includes(paymentMode)){
  const {data:payment,error:pe}=await db.from('studio_payments').insert({
   customer_id:customer.id,booking_id:id,created_by_user_id:ctx.user.id,created_by_name:ctx.profile.full_name,
   kind:'session',description:`${booking.service_name} · ${formatUkDate(booking.booking_date)} ${String(booking.start_time).slice(0,5)}`,
   amount_pence:amount,list_amount_pence:amount,hours_credit:0,status:'pending',discount_code:'none',discount_percent:0,discount_amount_pence:0
  }).select().single();if(pe)throw pe;
  const stripe=getStripe(),base=canonicalBase(new URL(req.url).origin);
  const methods=paymentMode==='pay_by_bank'?['pay_by_bank']:['card','pay_by_bank'];
  const session=await stripe.checkout.sessions.create({
   mode:'payment',payment_method_types:methods,invoice_creation:{enabled:true},customer_email:customer.email,
   client_reference_id:payment.id,metadata:{studio_payment_id:payment.id,booking_id:id,customer_id:customer.id,payment_kind:'session'},
   payment_method_options:paymentMode==='pay_by_bank'?{pay_by_bank:{statement_descriptor:'SILKCRAYON'}}:undefined,
   line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:amount,product_data:{name:`Silkcrayon — ${booking.service_name}`,description:`${formatUkDate(booking.booking_date)} · ${String(booking.start_time).slice(0,5)}–${String(booking.end_time).slice(0,5)} · Cardiff Bay`}}}],
   success_url:`${base}/booking/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/account`
  });
  paymentUrl=session.url;
  await db.from('studio_payments').update({stripe_checkout_session_id:session.id}).eq('id',payment.id);
  await db.from('bookings').update({stripe_checkout_session_id:session.id}).eq('id',id);
  const methodLabel=paymentMode==='pay_by_bank'?'Pay by Bank':'card or Pay by Bank';
  const payHtml=`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto;border:1px solid #3d3150;padding:30px"><div style="color:#C394FF;letter-spacing:3px;font-size:11px">SILKCRAYON STUDIOS</div><h1>Complete your session payment.</h1><p style="color:#c8c1cc">Hi ${esc(customer.artist_name||customer.full_name)}, your session is in the calendar. Use the secure ${methodLabel} link below to pay <b>£${(amount/100).toFixed(2)}</b>.</p><p><a href="${paymentUrl}" style="display:inline-block;background:#C394FF;color:#09050d;padding:14px 20px;text-decoration:none;font-weight:800">PAY FOR SESSION →</a></p><p style="color:#8f8894;font-size:12px">Booking: ${formatUkDate(booking.booking_date)} · ${String(booking.start_time).slice(0,5)}–${String(booking.end_time).slice(0,5)}</p></div></div>`;
  await sendLoggedNotification({booking,customer,type:'manual_booking_payment_link',subject:'Complete your Silkcrayon session payment',html:payHtml});
  if(customer.phone)await sendLoggedSms({booking,customer,type:'manual_booking_payment_link_sms',body:`Silkcrayon payment: £${(amount/100).toFixed(2)} for your ${formatUkDate(booking.booking_date)} session. Pay securely here: ${paymentUrl}`});
 }
 if(project){await db.from('studio_projects').update({status:['quoted','accepted','deposit_due'].includes(project.status)?'scheduled':project.status,updated_at:new Date().toISOString()}).eq('id',project.id);}
 return NextResponse.json({ok:true,bookingId:id,paymentUrl,idRequestSent,idRequestWarning,projectId:project?.id||null});
}catch(e){return NextResponse.json({error:e.message||'Could not create booking.'},{status:500})}}

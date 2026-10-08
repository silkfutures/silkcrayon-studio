import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {getStripe} from '../../../../lib/stripe';
import {londonDateTimeToUtc} from '../../../../lib/time';

const BASE='https://silkcrayon.com';
function fail(message,status=400){return NextResponse.json({error:message},{status});}
function clockToMinutes(value){
 if(!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(value))return null;
 const [h,m]=value.split(':').map(Number);return h*60+m;
}
function hhmm(minutes){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function normalEmail(s){return String(s||'').trim().toLowerCase();}
export async function POST(req){
 let bookingId=null;
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='engineer')return fail('Engineer access required.',403);
  const body=await req.json();
  const date=String(body.date||''),start=String(body.start||'');
  const minutes=clockToMinutes(start);
  const hours=Number(body.hours);
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||minutes===null||![2,3].includes(hours))
   return fail('Select a date, time and a 2- or 3-hour recording session.');
  if(minutes<600||minutes+hours*60>1260)return fail('Sessions must finish by 21:00 and start no earlier than 10:00.');
  const utc=londonDateTimeToUtc(date,start);
  if(!utc||utc.getTime()<=Date.now())return fail('Choose a future time.');
  if(body.customerTermsConfirmed!==true)return fail('Confirm that the customer has accepted the studio terms and recording policy.');

  const db=getAdminDb(),email=normalEmail(body.email);
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||email.length>254)return fail('Enter the artist’s valid email.');
  const {data:matches,error:lookupError}=await db.from('customers').select('id,created_at,registered_by_user_id,full_name,email').eq('email',email).limit(1);
  if(lookupError)throw lookupError;
  let customer=matches?.[0]||null;
  let introduced=false;
  if(customer){
   const {data:assigned,error:assignedError}=await db.from('bookings').select('id').eq('customer_id',customer.id).eq('engineer_user_id',ctx.user.id).limit(1);
   if(assignedError)throw assignedError;
   if(customer.registered_by_user_id!==ctx.user.id&&!(assigned||[]).length)
    return fail('This artist already has a Silkcrayon record. Ask the owner to link them to your engineer account before booking.',409);
   introduced=customer.registered_by_user_id===ctx.user.id;
  }else{
   const fullName=String(body.fullName||'').trim(),artistName=String(body.artistName||'').trim(),phone=String(body.phone||'').trim();
   if(fullName.length<2||artistName.length<2)return fail('Add the artist’s full name and artist name.');
   if(fullName.length>150||artistName.length>150||phone.length>40)return fail('Artist details are too long.');
   const {data:newCustomer,error:createError}=await db.from('customers').insert({
    full_name:fullName,artist_name:artistName,email,phone:phone||null,
    marketing_source:'engineer_referral',marketing_consent:false,sms_marketing_consent:false,
    harmful_music_policy_accepted:true,policy_accepted_at:new Date().toISOString(),
    registered_by_user_id:ctx.user.id
   }).select('id,created_at,registered_by_user_id,full_name,email').single();
   if(createError){
    if(createError.code==='23505')return fail('This artist already exists. Refresh and contact the owner to link the record.',409);
    throw createError;
   }
   customer=newCustomer;introduced=true;
  }
  // Six-month lead incentive; repeat sessions from the same introduced customer qualify.
  const qualifies=introduced&&Date.now()-new Date(customer.created_at).getTime()<183*24*60*60*1000;
  const engineerFeePence=hours*(qualifies?2500:2000);
  const amountPence=hours*5000; // Never accept prices or fee rates from the client.
  const end=hhmm(minutes+hours*60);
  const expiry=new Date(Date.now()+23*60*60*1000);
  const {data:id,error:reserveError}=await db.rpc('reserve_booking',{
   p_customer_id:customer.id,p_service_slug:'vocal-recording',p_service_name:'Vocal Recording',
   p_booking_date:date,p_start_time:start,p_end_time:end,p_duration_minutes:hours*60,
   p_genre:null,p_notes:String(body.notes||'').slice(0,1000)||null,p_amount_pence:amountPence,
   p_hold_expires_at:expiry.toISOString(),p_harmful_music_policy_accepted:true
  });
  if(reserveError){
   if(String(reserveError.message).includes('slot_unavailable'))return fail('That time is unavailable. Please select another.',409);
   throw reserveError;
  }
  bookingId=id;
  const assignmentNote=`Engineer portal booking; lead=${qualifies?'engineer_introduced':'existing_customer'}; engineer_fee_pence=${engineerFeePence}; created_by=${ctx.user.id}; price=5000_per_hour`;
  const {error:bookingError}=await db.from('bookings').update({
   engineer_user_id:ctx.user.id,assigned_engineer:ctx.profile.engineer_name||ctx.profile.full_name,
   status:'pending',payment_status:'unpaid',payment_method:'stripe',amount_paid_pence:0,
   internal_notes:assignmentNote,terms_version:'2026-08-14',cancellation_policy_version:'2026-08-14',
   harmful_music_policy_version:'2026-08-14',privacy_policy_version:'2026-08-14',
   policy_accepted_at:new Date().toISOString(),harmful_music_policy_accepted:true,
   updated_at:new Date().toISOString()
  }).eq('id',id);
  if(bookingError)throw bookingError;
  const {data:payment,error:paymentError}=await db.from('studio_payments').insert({
   customer_id:customer.id,booking_id:id,created_by_user_id:ctx.user.id,
   created_by_name:ctx.profile.full_name,kind:'session',
   description:`Engineer booking · Vocal Recording · ${date} ${start}`,
   amount_pence:amountPence,list_amount_pence:amountPence,hours_credit:0,status:'pending',
   discount_code:'none',discount_percent:0,discount_amount_pence:0
  }).select('id').single();
  if(paymentError)throw paymentError;
  const checkout=await getStripe().checkout.sessions.create({
   mode:'payment',payment_method_types:['card'],customer_email:customer.email,
   expires_at:Math.floor(expiry.getTime()/1000),
   client_reference_id:payment.id,
   metadata:{studio_payment_id:payment.id,booking_id:id,customer_id:customer.id,payment_kind:'session'},
   line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:amountPence,
    product_data:{name:'Silkcrayon — Vocal Recording',description:`${date} · ${start}–${end} · Cardiff Bay`}}}],
   success_url:`${BASE}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
   cancel_url:`${BASE}/booking`
  });
  const {error:sessionError}=await db.from('studio_payments').update({stripe_checkout_session_id:checkout.id}).eq('id',payment.id);
  if(sessionError)throw sessionError;
  await db.from('bookings').update({stripe_checkout_session_id:checkout.id}).eq('id',id);
  return NextResponse.json({bookingId:id,checkoutUrl:checkout.url,amountPence,engineerFeePence,qualifies,expiresAt:expiry.toISOString()});
 }catch(e){
  console.error('Engineer booking creation failed',e);
  // Release reserved calendar time after a failed payment-link creation.
  if(bookingId){try{await getAdminDb().from('bookings').update({status:'cancelled',hold_expires_at:null}).eq('id',bookingId).eq('payment_status','unpaid');}catch{}}
  return fail('Could not create the payment link. Please retry or contact Silkcrayon.',500);
 }
}

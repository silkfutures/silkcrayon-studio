import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/supabase';
import { getStaffContext } from '../../../../lib/auth';
import { sessionFollowupEmail, sendLoggedNotification } from '../../../../lib/notifications';
import { recordBookingEvent } from '../../../../lib/bookingEvents';
import { getStudioSettings } from '../../../../lib/studioSettings';

export async function POST(req){
 try{
  const ctx=await getStaffContext();
  if(!ctx)return NextResponse.json({error:'Staff access required.'},{status:403});
  const b=await req.json();
  const db=getAdminDb();
  let engineerUserId=null;
  let engineer='';

  if(ctx.profile.role==='engineer'){
   engineerUserId=ctx.user.id;
   engineer=ctx.profile.engineer_name||ctx.profile.full_name||'';
  }else{
   engineerUserId=b.engineerUserId||null;
   if(engineerUserId){
    const {data:staff,error:staffError}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,role,active').eq('user_id',engineerUserId).maybeSingle();
    if(staffError)throw staffError;
    if(!staff||!staff.active||!['owner','engineer'].includes(staff.role))return NextResponse.json({error:'Select an active engineer.'},{status:400});
    engineer=staff.engineer_name||staff.full_name||'';
   }else if(b.engineer){
    // Backwards compatibility for a stale report form already open in a browser.
    engineer=String(b.engineer).trim();
   }
  }

  if(!engineer||!b.artistName||!b.sessionDate||!b.actualHours)return NextResponse.json({error:'Engineer, artist, date and hours are required.'},{status:400});

  let customerId=null;
  if(b.bookingId){
   const {data:booking,error:be}=await db.from('bookings').select('customer_id,engineer_user_id').eq('id',b.bookingId).single();
   if(be)throw be;
   if(ctx.profile.role==='engineer'&&booking.engineer_user_id!==ctx.user.id)return NextResponse.json({error:'This booking is not assigned to you.'},{status:403});
   customerId=booking.customer_id||null;
  }else if(b.customerId){
   if(ctx.profile.role!=='owner')return NextResponse.json({error:'Only the owner can link a manual session to an artist.'},{status:403});
   const {data:customer,error:ce}=await db.from('customers').select('id,artist_name,full_name').eq('id',b.customerId).maybeSingle();
   if(ce)throw ce;if(!customer)return NextResponse.json({error:'Artist not found.'},{status:404});
   customerId=customer.id;
   if(!b.artistName)b.artistName=customer.artist_name||customer.full_name;
  }

  let extraPayment=null;
  if(b.bookingId&&customerId&&b.extraPaymentPaid==='yes'){
   if(ctx.profile.role!=='owner')return NextResponse.json({error:'Only the owner can record an external payment.'},{status:403});
   const extraHours=Math.max(0,Number(b.extraHours||0)),amount=Math.round(Number(b.extraPaymentAmount||0)*100),method=String(b.extraPaymentMethod||'');
   if(extraHours<=0)return NextResponse.json({error:'Additional payment can only be recorded when actual time exceeds booked time.'},{status:400});
   if(!Number.isFinite(amount)||amount<30)return NextResponse.json({error:'Enter the amount received for the extra time.'},{status:400});
   if(!['bank_transfer','cash','external_card','other'].includes(method))return NextResponse.json({error:'Choose how the extra time was paid.'},{status:400});
   extraPayment={extraHours,amount,method};
  }

  const manualSessionPaid=!b.bookingId&&b.sessionPaymentPaid==='yes';
  let manualSessionPayment=null;
  if(manualSessionPaid){
   if(ctx.profile.role!=='owner')return NextResponse.json({error:'Only the owner can record an external payment.'},{status:403});
   if(!customerId)return NextResponse.json({error:'Choose the artist for this paid session.'},{status:400});
   const amount=Math.round(Number(b.sessionPaymentAmount||0)*100),method=String(b.sessionPaymentMethod||'');
   if(!Number.isFinite(amount)||amount<30)return NextResponse.json({error:'Enter the amount received for this session.'},{status:400});
   if(!['bank_transfer','cash','external_card','other'].includes(method))return NextResponse.json({error:'Choose how the session was paid.'},{status:400});
   manualSessionPayment={amount,method};
  }

  const {data:report,error}=await db.from('session_reports').insert({booking_id:b.bookingId||null,customer_id:customerId,engineer,artist_name:b.artistName,session_date:b.sessionDate,start_time:b.startTime||null,actual_hours:Number(b.actualHours),payment_method:manualSessionPayment?.method||b.paymentMethod||null,engineer_fee_pence:0,studio_fee_pence:manualSessionPayment?.amount||Math.round(Number(b.studioFee||0)*100),work_completed:b.workCompleted||null,files_status:b.filesStatus||null,follow_up:b.projectStatus||null,project_status:b.projectStatus||null,notes:b.notes||null,submitted_by_user_id:ctx.user.id,submitted_by_name:ctx.profile.full_name}).select('id').single();
  if(error)throw error;
  let extraPaymentRecorded=false,manualSessionPaymentRecorded=false;
  if(manualSessionPayment){
   const now=new Date().toISOString();
   const {error:manualPayError}=await db.from('studio_payments').insert({customer_id:customerId,booking_id:null,session_report_id:report.id,created_by_user_id:ctx.user.id,created_by_name:ctx.profile.full_name,kind:'session',description:`Studio session · ${Number(b.actualHours)}h`,amount_pence:manualSessionPayment.amount,list_amount_pence:manualSessionPayment.amount,hours_credit:0,session_hours:Number(b.actualHours),status:'paid',paid_at:now,payment_method:manualSessionPayment.method,payment_category:'session',discount_code:'none',discount_percent:0,discount_amount_pence:0});
   if(manualPayError)throw manualPayError;manualSessionPaymentRecorded=true;
  }
  if(extraPayment){
   const now=new Date().toISOString();
   const {error:payError}=await db.from('studio_payments').insert({customer_id:customerId,booking_id:b.bookingId,session_report_id:report.id,created_by_user_id:ctx.user.id,created_by_name:ctx.profile.full_name,kind:'session',description:`Extra studio time · ${extraPayment.extraHours}h`,amount_pence:extraPayment.amount,list_amount_pence:extraPayment.amount,hours_credit:0,session_hours:extraPayment.extraHours,status:'paid',paid_at:now,payment_method:extraPayment.method,payment_category:'extra_time',discount_code:'none',discount_percent:0,discount_amount_pence:0});
   if(payError)throw payError;
   extraPaymentRecorded=true;
  }

  if(b.bookingId){
   const bookingPatch={status:'completed',assigned_engineer:engineer};
   if(engineerUserId)bookingPatch.engineer_user_id=engineerUserId;
   await db.from('bookings').update(bookingPatch).eq('id',b.bookingId);
   const {data:done}=await db.from('bookings').select('*,customers(*)').eq('id',b.bookingId).maybeSingle();
   if(done){await recordBookingEvent({db,booking:done,eventType:'completed',note:b.workCompleted||null,ctx});}
   if(done?.customers?.email){
    const pricing=await getStudioSettings();const msg=sessionFollowupEmail(done,done.customers,pricing);
    await sendLoggedNotification({booking:done,customer:done.customers,type:'session_followup',...msg});
   }
  }
  return NextResponse.json({ok:true,extraPaymentRecorded,manualSessionPaymentRecorded});
 }catch(e){return NextResponse.json({error:e.message},{status:500})}
}

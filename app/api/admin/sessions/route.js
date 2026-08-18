import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/supabase';
import { getStaffContext } from '../../../../lib/auth';
import { sessionFollowupEmail, sendLoggedNotification } from '../../../../lib/notifications';
import { recordBookingEvent } from '../../../../lib/bookingEvents';

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
  }

  const {error}=await db.from('session_reports').insert({booking_id:b.bookingId||null,customer_id:customerId,engineer,artist_name:b.artistName,session_date:b.sessionDate,start_time:b.startTime||null,actual_hours:Number(b.actualHours),payment_method:b.paymentMethod||null,engineer_fee_pence:0,studio_fee_pence:Math.round(Number(b.studioFee||0)*100),work_completed:b.workCompleted||null,files_status:b.filesStatus||null,follow_up:b.projectStatus||null,project_status:b.projectStatus||null,notes:b.notes||null,submitted_by_user_id:ctx.user.id,submitted_by_name:ctx.profile.full_name});
  if(error)throw error;

  if(b.bookingId){
   const bookingPatch={status:'completed',assigned_engineer:engineer};
   if(engineerUserId)bookingPatch.engineer_user_id=engineerUserId;
   await db.from('bookings').update(bookingPatch).eq('id',b.bookingId);
   const {data:done}=await db.from('bookings').select('*,customers(*)').eq('id',b.bookingId).maybeSingle();
   if(done){await recordBookingEvent({db,booking:done,eventType:'completed',note:b.workCompleted||null,ctx});}
   if(done?.customers?.email){
    const msg=sessionFollowupEmail(done,done.customers);
    await sendLoggedNotification({booking:done,customer:done.customers,type:'session_followup',...msg});
   }
  }
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e.message},{status:500})}
}

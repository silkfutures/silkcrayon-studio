import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {recordBookingEvent} from '../../../../../../lib/bookingEvents';
import {noShowEmail,bookingCancelledEmail,sendLoggedNotification,ownerEmails,sendEmail} from '../../../../../../lib/notifications';

function today(){return new Date().toISOString().slice(0,10)}
export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx)return NextResponse.json({error:'Staff access required.'},{status:403});
  const {id}=await params,b=await req.json(),db=getAdminDb();
  const {data:booking,error}=await db.from('bookings').select('*,customers(*)').eq('id',id).single();if(error)throw error;
  const owner=ctx.profile.role==='owner';
  if(!owner&&booking.engineer_user_id&&booking.engineer_user_id!==ctx.user.id)return NextResponse.json({error:'This session is assigned to another engineer.'},{status:403});

  if(b.action==='no_show'){
    if(!['confirmed','pending'].includes(booking.status))return NextResponse.json({error:'Only an active booking can be marked as a no-show.'},{status:409});
    if(booking.booking_date>today())return NextResponse.json({error:'A future session cannot be marked as a no-show.'},{status:409});
    const note=String(b.note||'').trim().slice(0,500)||null;
    const now=new Date().toISOString();
    const {data:updated,error:ue}=await db.from('bookings').update({status:'no_show',no_show_at:now,no_show_note:note,no_show_by_user_id:ctx.user.id,updated_at:now}).eq('id',id).select('*,customers(*)').single();if(ue)throw ue;
    await recordBookingEvent({db,booking:updated,eventType:'no_show',reasonCode:'no_show',note,ctx});
    if(updated.customers?.email){const msg=noShowEmail(updated,updated.customers);await sendLoggedNotification({booking:updated,customer:updated.customers,type:'no_show_followup',...msg})}
    if(!owner){const owners=await ownerEmails();for(const email of owners)await sendEmail({to:email,subject:`No-show — ${updated.customers?.artist_name||updated.customers?.full_name}`,html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:30px"><h1>Session marked no-show.</h1><p>${updated.customers?.artist_name||updated.customers?.full_name} · ${updated.booking_date} ${String(updated.start_time).slice(0,5)}</p><p>Marked by ${ctx.profile.full_name}.</p>${note?`<p>${note}</p>`:''}</div>`})}
    return NextResponse.json({ok:true,booking:updated});
  }

  if(b.action==='cancel'){
    if(!owner)return NextResponse.json({error:'Only an owner can cancel a booking.'},{status:403});
    if(!['confirmed','pending'].includes(booking.status))return NextResponse.json({error:'This booking is already closed.'},{status:409});
    const reason=String(b.reason||'').trim();
    const allowed=['customer_cancelled','studio_cancelled','duplicate','booking_error','other'];
    if(!allowed.includes(reason))return NextResponse.json({error:'Choose a cancellation reason.'},{status:400});
    const note=String(b.note||'').trim().slice(0,500)||null,now=new Date().toISOString();
    const {data:updated,error:ue}=await db.from('bookings').update({status:'cancelled',cancellation_reason_code:reason,cancellation_reason_note:note,cancelled_at:now,cancelled_by_user_id:ctx.user.id,updated_at:now}).eq('id',id).select('*,customers(*)').single();if(ue)throw ue;
    await recordBookingEvent({db,booking:updated,eventType:'cancelled',reasonCode:reason,note,ctx});
    if(updated.customers?.email){const msg=bookingCancelledEmail(updated,updated.customers,{reason,note,refunded:updated.payment_status==='refunded'});await sendLoggedNotification({booking:updated,customer:updated.customers,type:'booking_cancelled',...msg})}
    return NextResponse.json({ok:true,booking:updated});
  }

  return NextResponse.json({error:'Unknown lifecycle action.'},{status:400});
 }catch(e){return NextResponse.json({error:e.message||'Could not update session.'},{status:500})}
}

import {NextResponse} from 'next/server';
import {getCustomerContext} from '../../../../../lib/customerAuth';
import {getAdminDb} from '../../../../../lib/supabase';
import {generateSlots} from '../../../../../lib/availability';
import {ownerEmails,sendEmail} from '../../../../../lib/notifications';

const cutoffHours=()=>Number(process.env.CUSTOMER_CHANGE_CUTOFF_HOURS||24);
function hoursUntil(b){return (new Date(`${b.booking_date}T${String(b.start_time).slice(0,8)}+01:00`).getTime()-Date.now())/36e5}

export async function PATCH(req,{params}){
 try{
  const ctx=await getCustomerContext();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
  const {id}=await params,b=await req.json(),db=getAdminDb();
  const {data:booking}=await db.from('bookings').select('*').eq('id',id).eq('customer_id',ctx.customer.id).maybeSingle();
  if(!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(booking.status!=='confirmed')return NextResponse.json({error:'Only confirmed bookings can be changed.'},{status:409});
  if(hoursUntil(booking)<cutoffHours())return NextResponse.json({error:`Online changes close ${cutoffHours()} hours before your session. Please contact the studio.`},{status:409});
  if(b.action==='reschedule'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')||!/^\d{2}:\d{2}$/.test(b.start||''))return NextResponse.json({error:'Choose a valid date and time.'},{status:400});
    const [{data:existing=[]},{data:blockouts=[]}]=await Promise.all([db.from('bookings').select('id,start_time,end_time,status,hold_expires_at').eq('booking_date',b.date).in('status',['pending','confirmed']),db.from('blockouts').select('start_time,end_time').eq('booking_date',b.date)]);
    const now=new Date().toISOString(),live=existing.filter(x=>x.id!==id&&(x.status==='confirmed'||!x.hold_expires_at||x.hold_expires_at>now));
    const slot=generateSlots(b.date,booking.duration_minutes,live,blockouts).find(x=>x.start===b.start);
    if(!slot)return NextResponse.json({error:'That slot is no longer available.'},{status:409});
    const {error}=await db.from('bookings').update({booking_date:b.date,start_time:slot.start,end_time:slot.end,customer_rescheduled_at:new Date().toISOString(),cancellation_requested_at:null,cancellation_request_note:null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    return NextResponse.json({ok:true});
  }
  if(b.action==='cancel_request'){
    const note=String(b.note||'').trim().slice(0,500)||null;
    const {error}=await db.from('bookings').update({cancellation_requested_at:new Date().toISOString(),cancellation_request_note:note,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    const owners=await ownerEmails();for(const email of owners){await sendEmail({to:email,subject:`Cancellation request — ${ctx.customer.artist_name||ctx.customer.full_name} · ${booking.booking_date}`,html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><h1>Cancellation request</h1><p>${ctx.customer.artist_name||ctx.customer.full_name} has requested to cancel:</p><p><b>${booking.service_name}</b><br>${booking.booking_date} · ${String(booking.start_time).slice(0,5)}</p><p>${note||'No note provided.'}</p><p><a style="color:#C394FF" href="${process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon-studio.vercel.app'}/admin">Open Studio OS →</a></p></div>`})}
    return NextResponse.json({ok:true,requested:true});
  }
  return NextResponse.json({error:'Unknown action.'},{status:400});
 }catch(e){return NextResponse.json({error:e.message||'Could not update booking.'},{status:500})}
}

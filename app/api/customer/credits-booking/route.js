import {NextResponse} from 'next/server';
import {getCustomerContext} from '../../../../lib/customerAuth';
import {getAdminDb} from '../../../../lib/supabase';
import {SERVICES,priceFor} from '../../../../lib/services';
import {generateSlots} from '../../../../lib/availability';
import {confirmationEmail,newBookingOwnerEmail,ownerEmails,sendLoggedNotification,sendStaffLoggedNotification} from '../../../../lib/notifications';

export async function POST(req){
 try{
  const ctx=await getCustomerContext(); if(!ctx)return NextResponse.json({error:'Sign in to use studio hours.'},{status:401});
  const b=await req.json(),service=SERVICES[b.service],duration=Number(b.duration);
  if(!service||!service.durations.includes(duration))return NextResponse.json({error:'Invalid session.'},{status:400});
  if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')||!/^\d{2}:\d{2}$/.test(b.start||''))return NextResponse.json({error:'Invalid date or time.'},{status:400});
  if(service.slug==='system-test')return NextResponse.json({error:'Test bookings cannot use studio hours.'},{status:400});
  const db=getAdminDb(),now=new Date().toISOString();
  const [{data:existing=[]},{data:blockouts=[]},{data:ledger=[]}]=await Promise.all([
    db.from('bookings').select('start_time,end_time,status,hold_expires_at').eq('booking_date',b.date).in('status',['pending','confirmed']),
    db.from('blockouts').select('start_time,end_time').eq('booking_date',b.date),
    db.from('credit_ledger').select('hours_delta').eq('customer_id',ctx.customer.id)
  ]);
  const balance=ledger.reduce((n,x)=>n+Number(x.hours_delta||0),0),needed=duration/60;
  if(balance<needed)return NextResponse.json({error:`You have ${balance}h available but this session needs ${needed}h.`},{status:409});
  const live=existing.filter(x=>x.status==='confirmed'||!x.hold_expires_at||x.hold_expires_at>now);
  const chosen=generateSlots(b.date,duration,live,blockouts).find(x=>x.start===b.start&&x.end===b.end);
  if(!chosen)return NextResponse.json({error:'That slot has just become unavailable.'},{status:409});
  const {data:id,error}=await db.rpc('reserve_credit_booking',{p_customer_id:ctx.customer.id,p_service_slug:service.slug,p_service_name:service.name,p_booking_date:b.date,p_start_time:b.start,p_end_time:b.end,p_duration_minutes:duration,p_genre:b.genre?.trim()||null,p_notes:b.notes?.trim()||null,p_amount_pence:priceFor(service,duration),p_harmful_music_policy_accepted:true});
  if(error){if(error.message?.includes('slot_unavailable'))return NextResponse.json({error:'That slot has just become unavailable.'},{status:409});if(error.message?.includes('insufficient_credits'))return NextResponse.json({error:'Your studio-hour balance changed. Please refresh and try again.'},{status:409});throw error}
  const {data:booking}=await db.from('bookings').select('*,customers(*)').eq('id',id).single();
  if(booking?.customers?.email){const msg=confirmationEmail(booking,booking.customers,{firstTime:false,paymentLabel:`${needed}h studio credit`});await sendLoggedNotification({booking,customer:booking.customers,type:'credit_booking_confirmation',...msg})}
  const owners=await ownerEmails();const msg=newBookingOwnerEmail(booking,booking.customers||{},{firstTime:false,bookingCount:0,lifetimeSpendPence:0,paymentLabel:`${needed}h credit used`});for(const email of owners)await sendStaffLoggedNotification({booking,type:'owner_new_booking',to:email,...msg});
  return NextResponse.json({ok:true,bookingId:id});
 }catch(e){return NextResponse.json({error:e.message||'Could not book with studio hours.'},{status:500})}
}

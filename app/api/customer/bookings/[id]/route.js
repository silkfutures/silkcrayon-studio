import {NextResponse} from 'next/server';
import {getCustomerContext} from '../../../../../lib/customerAuth';
import {getAdminDb} from '../../../../../lib/supabase';
import {generateSlots} from '../../../../../lib/availability';
import {ownerEmails,sendEmail,staffEmail} from '../../../../../lib/notifications';

const cutoffHours=()=>Number(process.env.CUSTOMER_CHANGE_REQUEST_CUTOFF_HOURS||48);
function hoursUntil(b){return (new Date(`${b.booking_date}T${String(b.start_time).slice(0,8)}+01:00`).getTime()-Date.now())/36e5}
const base=()=>process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon-studio.vercel.app';
const pretty=(v)=>String(v||'').slice(0,5);
function mail(title,body,buttonLabel,href){return `<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto;border:1px solid #3d3150;padding:30px"><div style="color:#C394FF;font-size:11px;letter-spacing:3px;font-weight:800">SILKCRAYON STUDIOS</div><h1 style="font-size:34px">${title}</h1><div style="color:#c8c1cc;line-height:1.7">${body}</div>${href?`<p style="margin-top:26px"><a href="${href}" style="display:inline-block;background:#C394FF;color:#09050d;padding:14px 18px;text-decoration:none;font-weight:800">${buttonLabel}</a></p>`:''}</div></div>`}

export async function PATCH(req,{params}){
 try{
  const ctx=await getCustomerContext();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
  const {id}=await params,b=await req.json(),db=getAdminDb();
  const {data:booking}=await db.from('bookings').select('*').eq('id',id).eq('customer_id',ctx.customer.id).maybeSingle();
  if(!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(booking.status!=='confirmed')return NextResponse.json({error:'Only confirmed bookings can be changed.'},{status:409});

  if(b.action==='change_request'){
    if(hoursUntil(booking)<cutoffHours())return NextResponse.json({error:`Session change requests close ${cutoffHours()} hours before your session. Please contact the studio.`},{status:409});
    if(booking.change_request_status==='pending')return NextResponse.json({error:'You already have a change request awaiting confirmation.'},{status:409});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')||!/^\d{2}:\d{2}$/.test(b.start||''))return NextResponse.json({error:'Choose a valid date and time.'},{status:400});
    const [{data:existing=[]},{data:blockouts=[]}]=await Promise.all([db.from('bookings').select('id,start_time,end_time,status,hold_expires_at').eq('booking_date',b.date).in('status',['pending','confirmed']),db.from('blockouts').select('start_time,end_time').eq('booking_date',b.date)]);
    const now=new Date().toISOString(),live=existing.filter(x=>x.id!==id&&(x.status==='confirmed'||!x.hold_expires_at||x.hold_expires_at>now));
    const slot=generateSlots(b.date,booking.duration_minutes,live,blockouts).find(x=>x.start===b.start);
    if(!slot)return NextResponse.json({error:'That slot is no longer available.'},{status:409});
    const note=String(b.note||'').trim().slice(0,500)||null;
    const {data:updated,error}=await db.from('bookings').update({change_requested_at:new Date().toISOString(),change_requested_date:b.date,change_requested_start:slot.start,change_requested_end:slot.end,change_request_note:note,change_request_status:'pending',change_request_resolved_at:null,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(error)throw error;

    const artist=ctx.customer.artist_name||ctx.customer.full_name;
    const oldSlot=`${booking.booking_date} · ${pretty(booking.start_time)}–${pretty(booking.end_time)}`;
    const newSlot=`${b.date} · ${pretty(slot.start)}–${pretty(slot.end)}`;
    const body=`<p><b>${artist}</b> has requested to move a session.</p><p>Current: <b>${oldSlot}</b><br>Requested: <b style="color:#C394FF">${newSlot}</b></p>${note?`<p>Note: ${note}</p>`:''}<p>The booking has <b>not</b> moved yet. Owner approval is required.</p>`;
    const owners=await ownerEmails();for(const email of owners)await sendEmail({to:email,subject:`Session change request — ${artist} · ${newSlot}`,html:mail('Session change request',body,'REVIEW REQUEST',`${base()}/admin`)});
    if(booking.engineer_user_id){const eng=await staffEmail(booking.engineer_user_id);if(eng)await sendEmail({to:eng,subject:`Session change requested — ${artist}`,html:mail('Change requested',body,'VIEW YOUR SCHEDULE',`${base()}/admin/engineer`)})}
    if(ctx.customer.email)await sendEmail({to:ctx.customer.email,subject:'Your Silkcrayon session change request',html:mail('Request received.',`<p>We’ve received your request to move <b>${booking.service_name}</b> from ${oldSlot} to <b>${newSlot}</b>.</p><p>Your original booking remains confirmed until the studio approves the change. We’ll email you when there’s an update.</p>`,'OPEN MY STUDIO',`${base()}/account`)});
    return NextResponse.json({ok:true,requested:true});
  }

  if(b.action==='cancel_request'){
    const note=String(b.note||'').trim().slice(0,500)||null;
    const {error}=await db.from('bookings').update({cancellation_requested_at:new Date().toISOString(),cancellation_request_note:note,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;
    const owners=await ownerEmails();for(const email of owners){await sendEmail({to:email,subject:`Cancellation request — ${ctx.customer.artist_name||ctx.customer.full_name} · ${booking.booking_date}`,html:mail('Cancellation request',`<p>${ctx.customer.artist_name||ctx.customer.full_name} has requested to cancel:</p><p><b>${booking.service_name}</b><br>${booking.booking_date} · ${pretty(booking.start_time)}</p><p>${note||'No note provided.'}</p>`,'OPEN STUDIO OS',`${base()}/admin`)})}
    return NextResponse.json({ok:true,requested:true});
  }
  return NextResponse.json({error:'Unknown action.'},{status:400});
 }catch(e){return NextResponse.json({error:e.message||'Could not update booking.'},{status:500})}
}
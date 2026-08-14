import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../lib/supabase';
import { getStaffContext } from '../../../../../lib/auth';
import { engineerAssignedEmail, sendStaffLoggedNotification, staffEmail, sendEmail } from '../../../../../lib/notifications';
export async function PATCH(request,{params}){try{const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});const {id}=await params;const body=await request.json();const patch={updated_at:new Date().toISOString()};let assigned=null;if(body.status){const allowed=['pending','confirmed','cancelled','completed','no_show'];if(!allowed.includes(body.status))return NextResponse.json({error:'Invalid status'},{status:400});patch.status=body.status;}if('internalNotes' in body)patch.internal_notes=body.internalNotes||null;if('engineerUserId' in body){if(body.engineerUserId){const db=getAdminDb();const {data:eng,error:ee}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,active,role').eq('user_id',body.engineerUserId).single();if(ee||!eng||!eng.active||eng.role!=='engineer')return NextResponse.json({error:'Engineer not found or inactive.'},{status:400});patch.engineer_user_id=eng.user_id;patch.assigned_engineer=eng.engineer_name||eng.full_name;assigned=eng;}else{patch.engineer_user_id=null;patch.assigned_engineer=null;}}
 const db=getAdminDb();
 if(body.changeRequestDecision){
   const {data:current,error:ce}=await db.from('bookings').select('*,customers(*)').eq('id',id).single();if(ce)throw ce;
   if(current.change_request_status!=='pending')return NextResponse.json({error:'No pending change request.'},{status:409});
   const base=process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon-studio.vercel.app',artist=current.customers?.artist_name||current.customers?.full_name||'Artist';
   if(body.changeRequestDecision==='approve'){
     const {generateSlots}=await import('../../../../../lib/availability');
     const [{data:existing=[]},{data:blockouts=[]}]=await Promise.all([db.from('bookings').select('id,start_time,end_time,status,hold_expires_at').eq('booking_date',current.change_requested_date).in('status',['pending','confirmed']),db.from('blockouts').select('start_time,end_time').eq('booking_date',current.change_requested_date)]);
     const now=new Date().toISOString(),live=existing.filter(x=>x.id!==id&&(x.status==='confirmed'||!x.hold_expires_at||x.hold_expires_at>now));
     const slot=generateSlots(current.change_requested_date,current.duration_minutes,live,blockouts).find(x=>x.start===String(current.change_requested_start).slice(0,5));
     if(!slot)return NextResponse.json({error:'Requested slot is no longer available. Decline this request and ask the customer to choose another.'},{status:409});
     const {data:approved,error:ae}=await db.from('bookings').update({booking_date:current.change_requested_date,start_time:slot.start,end_time:slot.end,customer_rescheduled_at:new Date().toISOString(),change_request_status:'approved',change_request_resolved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).select('*,customers(*)').single();if(ae)throw ae;
     if(approved.customers?.email)await sendEmail({to:approved.customers.email,subject:'Your Silkcrayon session change is confirmed',html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><h1>Change confirmed.</h1><p>Hi ${artist}, your session has been moved to <b>${approved.booking_date} · ${String(approved.start_time).slice(0,5)}–${String(approved.end_time).slice(0,5)}</b>.</p><p><a style="color:#C394FF" href="${base}/account">Open My Studio →</a></p></div>`});
     if(approved.engineer_user_id){const ee=await staffEmail(approved.engineer_user_id);if(ee)await sendEmail({to:ee,subject:`Session change confirmed — ${artist}`,html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><h1>Schedule updated.</h1><p>${artist}'s session is now <b>${approved.booking_date} · ${String(approved.start_time).slice(0,5)}–${String(approved.end_time).slice(0,5)}</b>.</p><p><a style="color:#C394FF" href="${base}/admin/engineer">Open engineer dashboard →</a></p></div>`})}
     return NextResponse.json(approved);
   }
   if(body.changeRequestDecision==='decline'){
     const {data:declined,error:de}=await db.from('bookings').update({change_request_status:'declined',change_request_resolved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).select('*,customers(*)').single();if(de)throw de;
     if(declined.customers?.email)await sendEmail({to:declined.customers.email,subject:'Update on your Silkcrayon session change request',html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><h1>Your original session stays booked.</h1><p>Hi ${artist}, we couldn’t confirm the requested change this time. Your original session remains booked for <b>${declined.booking_date} · ${String(declined.start_time).slice(0,5)}</b>.</p><p>If you need another option, contact the studio or submit another request.</p><p><a style="color:#C394FF" href="${base}/account">Open My Studio →</a></p></div>`});
     return NextResponse.json(declined);
   }
   return NextResponse.json({error:'Invalid decision.'},{status:400});
 }
 const {data,error}=await db.from('bookings').update(patch).eq('id',id).select('*,customers(*)').single();if(error)throw error;
 if(assigned){const email=await staffEmail(assigned.user_id);if(email){const msg=engineerAssignedEmail(data,data.customers||{},assigned.engineer_name||assigned.full_name);await sendStaffLoggedNotification({booking:data,type:'engineer_assignment',to:email,...msg});}}
 return NextResponse.json(data);}catch(e){return NextResponse.json({error:e.message},{status:500})}}

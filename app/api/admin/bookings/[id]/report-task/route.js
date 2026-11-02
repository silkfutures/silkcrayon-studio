import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {needsSessionReport} from '../../../../../../lib/unresolvedSessions';
import {londonToday} from '../../../../../../lib/time';
export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();
  if(ctx?.profile?.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin.'},{status:403});
  const {id}=await params,{action}=await req.json();
  if(!['dismiss','restore'].includes(action))return NextResponse.json({error:'Choose remove or restore.'},{status:400});
  const db=getAdminDb(),{data:booking,error}=await db.from('bookings').select('*,session_reports(id)').eq('id',id).maybeSingle();
  if(error)throw error;
  if(!booking)return NextResponse.json({error:'Session not found.'},{status:404});
  if(!needsSessionReport(booking,londonToday()))return NextResponse.json({error:'This session no longer needs a report.'},{status:409});
  const {error:saveError}=await db.from('booking_events').insert({booking_id:id,customer_id:booking.customer_id,event_type:action==='dismiss'?'report_dismissed':'report_restored',actor_user_id:ctx.user.id,actor_name:ctx.profile.full_name,actor_role:ctx.profile.role,note:action==='dismiss'?'Removed from unresolved reports; booking and payments retained.':'Restored to unresolved reports.'});
  if(saveError)throw saveError;
  return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error.message||'Could not update report task.'},{status:500});}
}

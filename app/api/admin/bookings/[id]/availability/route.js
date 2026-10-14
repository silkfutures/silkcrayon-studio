import {londonDateTimeToUtc} from '../../../../../../lib/time';
import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {generateSlots} from '../../../../../../lib/availability';
export async function GET(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx||!['owner','engineer'].includes(ctx.profile.role))return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,date=new URL(req.url).searchParams.get('date');if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return NextResponse.json({error:'Choose a valid date.'},{status:400});
  const db=getAdminDb(),{data:b,error:be}=await db.from('bookings').select('id,duration_minutes,service_slug,engineer_user_id').eq('id',id).single();if(be||!b)return NextResponse.json({error:'Booking not found.'},{status:404});
  if(ctx.profile.role==='engineer'&&b.engineer_user_id!==ctx.user.id)return NextResponse.json({error:'This session is not assigned to you.'},{status:403});
  const [{data:existing=[],error:ee},{data:blockouts=[],error:boe}]=await Promise.all([db.from('bookings').select('booking_date,id,start_time,end_time,status,hold_expires_at').gte('booking_date',new Date(new Date(date+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10)).lte('booking_date',date).in('status',['pending','confirmed']),db.from('blockouts').select('start_time,end_time,ignored_service_slugs').eq('booking_date',date)]);if(ee)throw ee;if(boe)throw boe;
  const now=new Date().toISOString(),live=existing.filter(x=>x.id!==id&&(x.status==='confirmed'||!x.hold_expires_at||x.hold_expires_at>now));
  return NextResponse.json({slots:generateSlots(date,b.duration_minutes,live,blockouts,b.service_slug).filter(slot=>londonDateTimeToUtc(date,slot.start)?.getTime()>Date.now())});
 }catch(e){return NextResponse.json({error:e.message||'Availability failed.'},{status:500})}
}

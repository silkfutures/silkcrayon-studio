import {NextResponse} from 'next/server';
import {getCustomerContext} from '../../../../lib/customerAuth';
import {getAdminDb} from '../../../../lib/supabase';
import {generateSlots} from '../../../../lib/availability';
import {programmeSlotAllowed} from '../../../../lib/supportedArtists';
export async function GET(req){try{
 const ctx=await getCustomerContext();if(!ctx)return NextResponse.json({error:'Sign in to use your supported rate.'},{status:401});
 const q=new URL(req.url).searchParams,date=q.get('date'),duration=Number(q.get('duration'));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||Number.isNaN(Date.parse(date))||![120,180,240,300,360,420,480].includes(duration))return NextResponse.json({error:'Choose a valid date and duration.'},{status:400});
 const db=getAdminDb(),{data:m,error}=await db.from('supported_artists').select('*').eq('customer_id',ctx.customer.id).maybeSingle();if(error)throw error;
 if(!m||m.status!=='approved')return NextResponse.json({error:'You do not have an active supported artist place.'},{status:403});
 const monthStart=date.slice(0,7)+'-01',nextMonth=new Date(monthStart+'T12:00:00Z');nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
 const previous=new Date(date+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);
 const [usedResult,bookingsResult,blockResult,engResult]=await Promise.all([
 db.from('bookings').select('duration_minutes,status,hold_expires_at').eq('supported_artist_id',m.id).gte('booking_date',monthStart).lt('booking_date',nextMonth.toISOString().slice(0,10)).neq('status','cancelled'),
 db.from('bookings').select('booking_date,start_time,end_time,status,hold_expires_at').gte('booking_date',previous.toISOString().slice(0,10)).lte('booking_date',date).in('status',['pending','confirmed']),
 db.from('blockouts').select('start_time,end_time,ignored_service_slugs').eq('booking_date',date),
 db.from('staff_profiles').select('user_id').eq('user_id',m.engineer_user_id).eq('active',true).in('role',['owner','engineer']).maybeSingle()]);
 for(const r of [usedResult,bookingsResult,blockResult,engResult])if(r.error)throw r.error;
 const now=new Date().toISOString(),live=b=>b.status!=='pending'||!b.hold_expires_at||b.hold_expires_at>now;
 const remaining=Math.max(0,480-usedResult.data.filter(live).reduce((n,b)=>n+b.duration_minutes,0));
 const slots=remaining>=duration&&engResult.data?generateSlots(date,duration,bookingsResult.data.filter(live),blockResult.data,'vocal-recording').filter(s=>programmeSlotAllowed(m,date,s.start,s.end,duration)):[];
 return NextResponse.json({slots,remainingMinutes:remaining},{headers:{'Cache-Control':'no-store'}});
}catch{return NextResponse.json({error:'Could not load programme availability. Please try again.'},{status:503});}}

import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {calendarFeedToken,calendarIcs} from '../../../../lib/calendarFeed';
export const dynamic='force-dynamic';
export async function GET(req){
 try{
  const expected=calendarFeedToken(),supplied=new URL(req.url).searchParams.get('token');
  if(!expected||!supplied||supplied!==expected)return new NextResponse('Not found',{status:404});
  const db=getAdminDb(),from=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const {data=[],error}=await db.from('bookings').select('id,booking_date,start_time,end_time,service_name,status,payment_status,assigned_engineer,created_at,updated_at,customers(full_name,artist_name)').gte('booking_date',from).in('status',['pending','confirmed']).order('booking_date').order('start_time');
  if(error)throw error;
  return new NextResponse(calendarIcs(data),{headers:{'content-type':'text/calendar; charset=utf-8','content-disposition':'inline; filename="silkcrayon-studio.ics"','cache-control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:e.message||'Calendar feed failed.'},{status:500})}
}

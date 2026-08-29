import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {singleBookingIcs} from '../../../../../../lib/calendarFeed';
export async function GET(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx)return new NextResponse('Sign in required',{status:401});
  const {id}=await params,{data:b,error}=await getAdminDb().from('bookings').select('id,booking_date,start_time,end_time,service_name,status,payment_status,assigned_engineer,created_at,updated_at,customers(full_name,artist_name)').eq('id',id).single();if(error||!b)return new NextResponse('Booking not found',{status:404});
  return new NextResponse(singleBookingIcs(b),{headers:{'content-type':'text/calendar; charset=utf-8','content-disposition':`attachment; filename="silkcrayon-${b.booking_date}.ics"`}});
 }catch(e){return NextResponse.json({error:e.message||'Could not create calendar file.'},{status:500})}
}

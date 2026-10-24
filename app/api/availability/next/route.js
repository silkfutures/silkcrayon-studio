import {NextResponse} from 'next/server';
import {SERVICES} from '../../../../lib/services';
import {getAdminDb} from '../../../../lib/supabase';
import {generateSlots} from '../../../../lib/availability';
import {rateLimit} from '../../../../lib/rateLimit';
import {londonToday} from '../../../../lib/time';

export const dynamic='force-dynamic';
// One bounded query replaces a series of client-side requests for individual days.
export async function GET(req){
 try{
  if(!await rateLimit(req,{scope:'availability-next',limit:30,windowSeconds:60,throwOnUnavailable:true}))
   return NextResponse.json({error:'Too many requests.'},{status:429});
  const p=new URL(req.url).searchParams;
  const service=SERVICES[p.get('service')],minutes=Number(p.get('duration'));
  const after=p.get('after');
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(after||'')&&!Number.isNaN(Date.parse(after+'T12:00:00Z'));
  if(!service||!service.durations.includes(minutes)||!validDate||after<londonToday())
   return NextResponse.json({error:'Choose a valid date and session.'},{status:400});
  const nextDay=new Date(after+'T12:00:00Z');
  nextDay.setUTCDate(nextDay.getUTCDate()+1);
  const start=nextDay.toISOString().slice(0,10);
  const last=new Date(after+'T12:00:00Z');last.setUTCDate(last.getUTCDate()+15);
  const end=last.toISOString().slice(0,10);
  const preceding=new Date(nextDay);preceding.setUTCDate(preceding.getUTCDate()-1);
  const db=getAdminDb();
  const [{data:bookings,error:bookError},{data:blockouts,error:blockError}]=await Promise.all([
   db.from('bookings').select('booking_date,start_time,end_time,status,hold_expires_at')
    .gte('booking_date',preceding.toISOString().slice(0,10)).lte('booking_date',end)
    .in('status',['pending','confirmed']),
   db.from('blockouts').select('booking_date,start_time,end_time,ignored_service_slugs')
    .gte('booking_date',start).lte('booking_date',end)
  ]);
  if(bookError||blockError)throw bookError||blockError;
  const current=new Date(), nowIso=current.toISOString();
  const live=(bookings||[]).filter(b=>b.status==='confirmed'||!b.hold_expires_at||b.hold_expires_at>nowIso);
  const alternatives=[];
  for(let i=0;i<15&&alternatives.length<3;i++){
   const d=new Date(nextDay);d.setUTCDate(d.getUTCDate()+i);
   const date=d.toISOString().slice(0,10);
   // Include yesterday's late-night booking in case it overlaps today's hours.
   const previous=new Date(d);previous.setUTCDate(previous.getUTCDate()-1);
   const previousDate=previous.toISOString().slice(0,10);
   const relevant=live.filter(x=>x.booking_date===date||x.booking_date===previousDate);
   const free=generateSlots(date,minutes,relevant,(blockouts||[]).filter(x=>x.booking_date===date),service.slug);
   if(free.length)alternatives.push({date,slots:free.slice(0,3)});
  }
  return NextResponse.json({alternatives});
 }catch(e){
  console.error('Alternative availability lookup failed',e?.message||e);
  return NextResponse.json({error:'Could not load alternative dates.'},{status:503});
 }
}

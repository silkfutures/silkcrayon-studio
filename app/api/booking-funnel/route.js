import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/supabase';
import {rateLimit} from '../../../lib/rateLimit';

// Only anonymous, predefined funnel events. Never accept an amount or payment state from the browser.
const allowed=new Set(['booking_view','service_selected','slot_selected','no_availability']);
const clean=(v,n)=>String(v||'').trim().slice(0,n);
export async function POST(req){
 try{
  if(!await rateLimit(req,{scope:'booking-funnel',limit:80,windowSeconds:60,throwOnUnavailable:true}))
   return NextResponse.json({ok:false},{status:429});
  const b=await req.json().catch(()=>({}));
  if(!allowed.has(b.eventName))return NextResponse.json({error:'Invalid event.'},{status:400});
  const visitorId=clean(b.visitorId,100);
  if(!/^[a-zA-Z0-9_-]{12,100}$/.test(visitorId))return NextResponse.json({error:'Invalid anonymous visitor ID.'},{status:400});
  const {error}=await getAdminDb().from('booking_funnel_events').insert({
   event_name:b.eventName,visitor_id:visitorId,service_slug:clean(b.service,60)||null,
   utm_source:clean(b.utmSource,120)||null,utm_medium:clean(b.utmMedium,120)||null,
   utm_campaign:clean(b.utmCampaign,120)||null,referrer_host:clean(b.referrerHost,120)||null
  });
  if(error)throw error;
  return NextResponse.json({ok:true});
 }catch(e){
  console.error('Booking funnel event unavailable',e?.message||e);
  return NextResponse.json({ok:false},{status:503});
 }
}

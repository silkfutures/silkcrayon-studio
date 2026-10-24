// Funnel events are anonymous, and paid events are inserted only after Stripe verification.
export async function loadBookingFunnel(db,since){
 const rows=[],size=500;
 for(let offset=0;;offset+=size){
  const {data,error}=await db.from('booking_funnel_events')
   .select('event_name,visitor_id,booking_id,service_slug,utm_source,utm_medium,utm_campaign,referrer_host,created_at')
   .gte('created_at',since).order('created_at',{ascending:true}).order('id',{ascending:true})
   .range(offset,offset+size-1);
  if(error)throw error;
  rows.push(...(data||[]));
  if(!data||data.length<size)break;
 }
 return rows;
}
export function summariseBookingFunnel(events=[]){
 const visitors=kind=>new Set(events.filter(e=>e.event_name===kind&&e.visitor_id).map(e=>e.visitor_id)).size;
 const checkout=events.filter(e=>e.event_name==='checkout_started'&&e.booking_id);
 const started=new Set(checkout.map(e=>e.booking_id));
 const paid=new Set(events.filter(e=>e.event_name==='booking_paid'&&e.booking_id).map(e=>e.booking_id));
 const converted=[...started].filter(id=>paid.has(id)).length;
 const attribution={};
 for(const e of checkout){
  if(!paid.has(e.booking_id))continue;
  const source=String(e.utm_source||e.referrer_host||'Direct / unknown');
  attribution[source]=(attribution[source]||0)+1;
 }
 return {
  bookingViews:visitors('booking_view'),
  serviceSelections:visitors('service_selected'),
  timesChosen:visitors('slot_selected'),
  noAvailability:visitors('no_availability'),
  checkoutStarts:started.size,
  paidBookings:converted,
  checkoutRate:started.size?Math.round(converted/started.size*100):null,
  visitorRate:visitors('booking_view')?Math.round(converted/visitors('booking_view')*1000)/10:null,
  attribution
 };
}

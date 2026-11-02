export function dismissedReportIds(events=[]){
 const seen=new Set(),dismissed=new Set();
 for(const event of [...events].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))){
  if(seen.has(event.booking_id))continue;
  if(!['report_dismissed','report_restored'].includes(event.event_type))continue;
  seen.add(event.booking_id);
  if(event.event_type==='report_dismissed')dismissed.add(event.booking_id);
 }
 return dismissed;
}
export async function loadReportDismissals(db){
 const events=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await db.from('booking_events').select('booking_id,event_type,created_at').in('event_type',['report_dismissed','report_restored']).order('created_at',{ascending:false}).range(offset,offset+999);
  if(error)throw new Error('Could not load removed report tasks.');
  events.push(...(data||[]));if(!data||data.length<1000)break;
 }
 return dismissedReportIds(events);
}

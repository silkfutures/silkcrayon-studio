export async function recalcProjectRecordingHours(db,projectId){
 if(!projectId)return 0;
 const {data:bookings=[],error:be}=await db.from('bookings').select('id,status,duration_minutes').eq('project_id',projectId);
 if(be)throw be;
 const ids=bookings.map(b=>b.id);
 let used=0;
 if(ids.length){
  const {data:reports=[],error:re}=await db.from('session_reports').select('booking_id,actual_hours,created_at').in('booking_id',ids).order('created_at',{ascending:false});
  if(re)throw re;
  const latest=new Map();
  for(const r of reports){if(r.booking_id&&!latest.has(r.booking_id))latest.set(r.booking_id,Number(r.actual_hours||0));}
  for(const b of bookings){
   if(b.status!=='completed')continue;
   used+=latest.has(b.id)?latest.get(b.id):Number(b.duration_minutes||0)/60;
  }
 }
 used=Math.round(used*100)/100;
 const {error:ue}=await db.from('studio_projects').update({recording_hours_used:used,updated_at:new Date().toISOString()}).eq('id',projectId);
 if(ue)throw ue;
 return used;
}

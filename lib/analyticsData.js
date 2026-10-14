import {londonToday,londonDateTimeToUtc} from './time.js';
export function analyticsWindow(range, today=londonToday()){
 const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-(range-1));
 return {today,since:date.toISOString().slice(0,10),sinceIso:londonDateTimeToUtc(date.toISOString().slice(0,10),'00:00').toISOString()};
}
export async function loadPageViews(db,since){
 const rows=[],batch=500;
 for(let offset=0;;offset+=batch){
  const {data,error}=await db.from('page_views').select('id,visitor_id,path,referrer,created_at').gte('created_at',since).neq('path','/__analytics_check').order('created_at',{ascending:true}).order('id',{ascending:true}).range(offset,offset+batch-1);
  if(error)throw error;if(!Array.isArray(data))throw new Error('Visitor data unavailable');rows.push(...(data||[]));if(!data||data.length<batch)break;
 }
 return rows;
}

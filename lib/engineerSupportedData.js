import {getAdminDb} from './supabase';
import {permittedEngineer,supportedNetSpend,supportedProgrammeState,supportedUsage} from './supportedArtistReporting';
async function allRows(query){const rows=[];for(let from=0;;from+=500){const {data,error}=await query().range(from,from+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows;}}
export async function loadEngineerSupportedData(ctx,requested){
 const id=permittedEngineer(ctx,requested),db=getAdminDb();
 const {data:engineer,error}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,role,active,supported_hourly_price_pence,photo_url').eq('user_id',id).single();if(error)throw error;
 const [current,bookings]=await Promise.all([
 allRows(()=>db.from('supported_artists').select('id,artist_name,full_name,status,engineer_user_id,hourly_price_pence,monthly_limit_minutes,min_duration_minutes,starts_on,ends_on,created_at,goals').eq('engineer_user_id',id).order('id')),
 allRows(()=>db.from('bookings').select('id,supported_artist_id,engineer_user_id,booking_date,start_time,duration_minutes,status,payment_status,payment_method,amount_pence,amount_paid_pence,refunded_amount_pence,hold_expires_at,project_id,customers(full_name,artist_name)').eq('engineer_user_id',id).not('supported_artist_id','is',null).order('id'))
 ]);
 const map=new Map(current.map(m=>[m.id,m]));for(const b of bookings)if(!map.has(b.supported_artist_id))map.set(b.supported_artist_id,{id:b.supported_artist_id,artist_name:b.customers?.artist_name||b.customers?.full_name||'Artist',status:'former',former:true});
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date()),month=today.slice(0,7),monthEnd=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0)).toISOString().slice(0,10),now=new Date().toISOString();
 const events=await allRows(()=>db.from('supported_artist_events').select('id,supported_artist_id,created_at,event_type,details').eq('engineer_user_id',id).order('id'));
 // Usage is an aggregate across the artist's agreement, including sessions before reassignment.
 // Other engineers' booking/financial details are never returned to this profile.
 const usage=[];for(let i=0;i<current.length;i+=100){const ids=current.slice(i,i+100).map(m=>m.id);usage.push(...await allRows(()=>db.from('bookings').select('id,supported_artist_id,booking_date,duration_minutes,status,hold_expires_at').in('supported_artist_id',ids).gte('booking_date',month+'-01').lte('booking_date',monthEnd).order('id')));}
 const artists=[...map.values()].map(m=>{
  const own=bookings.filter(b=>b.supported_artist_id===m.id),live=own.filter(b=>b.status!=='cancelled'&&(b.status!=='pending'||!b.hold_expires_at||b.hold_expires_at>now));
  const timeline=[...own.map(b=>({id:b.id,date:b.booking_date+'T'+b.start_time,label:`${Number(b.duration_minutes)/60}h session · ${b.status.replaceAll('_',' ')}`,detail:`${b.payment_status.replaceAll('_',' ')} · £${(supportedNetSpend(b)/100).toFixed(2)} net paid`,bookingId:b.id})),...events.filter(e=>e.supported_artist_id===m.id).map(e=>{const a=e.details.after||{};return{id:e.id,date:e.created_at,label:e.event_type==='application'?'Application received':`Programme ${a.status||'updated'}`,detail:`£${(Number(a.hourly_price_pence||0)/100).toFixed(2)}/hour · ${Number(a.monthly_limit_minutes||0)/60}h/month · ${a.starts_on||'Dates pending'} to ${a.ends_on||'—'}`};})].sort((a,b)=>b.date.localeCompare(a.date));
  return {...m,state:m.former?'former':supportedProgrammeState(m,today),netSpendPence:own.reduce((n,b)=>n+supportedNetSpend(b),0),completedHours:own.filter(b=>b.status==='completed').reduce((n,b)=>n+b.duration_minutes/60,0),upcoming:live.filter(b=>b.status==='confirmed'&&b.booking_date>=today).length,usedMinutes:supportedUsage(usage.filter(b=>b.supported_artist_id===m.id),month,now),timeline};
 }).sort((a,b)=>(a.former?1:0)-(b.former?1:0)||a.artist_name.localeCompare(b.artist_name));
 return {engineer,artists,today};
}

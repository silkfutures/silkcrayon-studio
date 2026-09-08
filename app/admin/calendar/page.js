import Link from 'next/link';
import {requireStaff} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {EngineerHeader,EngineerBottomNav} from '../../../components/EngineerShell';
import AdminNav from '../../../components/AdminNav';
import {formatUkDate,formatUkMonth} from '../../../lib/dates';
import {calendarFeedUrl,webcalUrl} from '../../../lib/calendarFeed';
import AppleCalendarConnections from '../../../components/AppleCalendarConnections';
export const dynamic='force-dynamic';

function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function addDays(dateStr,days){const d=new Date(`${dateStr}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function monthBounds(dateStr){const ym=dateStr.slice(0,7),[y,m]=ym.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();return {start:`${ym}-01`,end:`${ym}-${String(last).padStart(2,'0')}`,days:last,ym}}
function weekdayMonday(date){const d=new Date(`${date}T12:00:00Z`).getUTCDay();return (d+6)%7}
function weekStart(date){return addDays(date,-weekdayMonday(date))}
function viewHref(view,date){return `/admin/calendar?view=${view}&date=${date}`}
function titleFor(view,anchor,start,end){
 if(view==='month')return formatUkMonth(anchor.slice(0,7));
 if(view==='week')return `Week of ${formatUkDate(start,{short:true})}`;
 return `${formatUkDate(start,{short:true})} – ${formatUkDate(end,{short:true})}`;
}
function rangeFor(view,anchor){
 if(view==='month'){const m=monthBounds(anchor);return {...m,navStep:'month'}}
 if(view==='agenda')return {start:anchor,end:addDays(anchor,13),days:14,navStep:14};
 const start=weekStart(anchor);return {start,end:addDays(start,6),days:7,navStep:7};
}
function shiftAnchor(view,anchor,dir){
 if(view==='month'){const [y,m]=anchor.slice(0,7).split('-').map(Number),day=Math.min(Number(anchor.slice(8,10)),28),d=new Date(Date.UTC(y,m-1+dir,day));return d.toISOString().slice(0,10)}
 return addDays(anchor,(view==='agenda'?14:7)*dir);
}

export default async function CalendarPage({searchParams}){
 const ctx=await requireStaff(),sp=await searchParams,db=getAdminDb(),now=new Date();
 const today=now.toISOString().slice(0,10),anchor=validDate(sp?.date)?sp.date:today,view=['week','month','agenda'].includes(sp?.view)?sp.view:'week';
 const {start,end,days}=rangeFor(view,anchor),eng=ctx.profile.role==='engineer',feedUrl=ctx.profile.role==='owner'?calendarFeedUrl():null,appleUrl=webcalUrl(feedUrl);
 let q=db.from('bookings').select('id,booking_date,start_time,end_time,service_name,status,payment_status,engineer_user_id,assigned_engineer,customers(id,full_name,artist_name)').gte('booking_date',start).lte('booking_date',end).neq('status','cancelled').order('booking_date').order('start_time');
 if(eng)q=q.eq('engineer_user_id',ctx.user.id);
 const [{data:bookings=[]},{data:blockouts=[]},{data:calendarSources=[]}]=await Promise.all([
  q,
  eng?Promise.resolve({data:[]}):db.from('blockouts').select('id,booking_date,start_time,end_time,reason,external_calendar_id').gte('booking_date',start).lte('booking_date',end).order('booking_date').order('start_time'),
  eng?Promise.resolve({data:[]}):db.from('external_calendars').select('id,name,active,block_all_day,buffer_before_minutes,buffer_after_minutes,last_synced_at,last_error,created_at').order('created_at')
 ]);
 const byDate={};for(const b of bookings)(byDate[b.booking_date]??=[]).push({...b,kind:'booking'});
 for(const b of blockouts)(byDate[b.booking_date]??=[]).push({...b,kind:'blockout'});
 let cells=[];
 if(view==='month'){
  const m=monthBounds(anchor),firstPad=weekdayMonday(m.start);
  cells=[...Array(firstPad).fill(null),...Array.from({length:m.days},(_,i)=>`${m.ym}-${String(i+1).padStart(2,'0')}`)];
  while(cells.length%7)cells.push(null);
 }else cells=Array.from({length:days},(_,i)=>addDays(start,i));
 const prev=shiftAnchor(view,anchor,-1),next=shiftAnchor(view,anchor,1);
 const event=(item)=>item.kind==='blockout'
  ?<div className="calendarEvent blockout" key={item.id}><b>{String(item.start_time).slice(0,5)}–{String(item.end_time).slice(0,5)}</b><span>{item.reason||'Blocked'}</span></div>
  :<Link href={`/admin/engineer/session/${item.id}`} className="calendarEvent" key={item.id}><b>{String(item.start_time).slice(0,5)}–{String(item.end_time).slice(0,5)}</b><span>{item.customers?.artist_name||item.customers?.full_name}</span><small>{item.service_name} · {item.payment_status==='paid'?'Paid':'Payment due'} · {item.engineer_user_id?(item.assigned_engineer||'Assigned'):'UNASSIGNED'}</small></Link>;
 return <main className={eng?'engApp calendarApp':'adminPage calendarApp'}>
  {eng?<EngineerHeader profile={ctx.profile} eyebrow="Calendar"/>:<header className="adminHeader"><div><p className="eyebrow">Studio schedule</p><h1>Calendar.</h1><p className="muted">Switch between the week, month and a simple upcoming agenda.</p></div><AdminNav profile={ctx.profile}/></header>}
  <section className={eng?'engWelcome compact':'adminSection calendarTop'}>
   <div className="calendarMonthNav"><Link href={viewHref(view,prev)}>←</Link><div><p className="eyebrow">{view} view</p><h2>{titleFor(view,anchor,start,end)}</h2></div><Link href={viewHref(view,next)}>→</Link></div>
   <div className="calendarTopRight"><div className="calendarViewToggle" aria-label="Calendar view"><Link className={view==='week'?'active':''} href={viewHref('week',anchor)}>Week</Link><Link className={view==='month'?'active':''} href={viewHref('month',anchor)}>Month</Link><Link className={view==='agenda'?'active':''} href={viewHref('agenda',anchor)}>Agenda</Link></div><div className="calendarActions"><Link className="button outline" href={viewHref(view,today)}>Today</Link><Link className="button primary" href="/admin/bookings/new">+ New booking</Link><Link className="button outline" href="/admin/sessions">Session reports</Link></div></div>
  </section>
  {view==='agenda'?<section className={eng?'engSection calendarAgenda':'adminSection calendarAgenda'}>{cells.map(date=><div className={`agendaDay ${date===today?'today':''}`} key={date}><div className="agendaDate"><small>{new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase()}</small><b>{formatUkDate(date)}</b></div><div className="agendaItems">{(byDate[date]||[]).length?(byDate[date]||[]).map(event):<span className="agendaEmpty">No sessions</span>}</div></div>)}</section>:<section className={eng?'engSection':'adminSection'}>
   <div className="calendarWeekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div>
   <div className={`studioCalendar ${view==='week'?'weekView':view==='month'?'monthView':''}`}>{cells.map((date,i)=>{
    if(!date)return <div className="calendarCell blank" key={`b${i}`}/>;
    const items=byDate[date]||[];
    return <div className={`calendarCell ${date===today?'today':''}`} key={date}><div className="calendarDate"><b>{Number(date.slice(-2))}</b><small>{formatUkDate(date,{short:true})}</small></div><div className="calendarItems">{items.map(event)}</div></div>
   })}</div>
  </section>}
  {!eng&&<details className="adminSection calendarSyncCompact" open><summary><span><b>Apple Calendar sync</b><small>Two-way availability · connect as many calendars as you need</small></span><span>›</span></summary><div className="calendarSyncCompactBody"><AppleCalendarConnections sources={calendarSources}/><div className="appleOutbound"><h3>Put studio bookings in Apple Calendar</h3>{feedUrl?<><p className="muted">Subscribe once and Studio OS bookings will appear in Apple Calendar when Apple refreshes the private feed.</p><div className="calendarSyncActions"><a className="button outline" href={appleUrl}>Subscribe in Apple Calendar</a><details><summary>Manual subscription URL</summary><code>{feedUrl}</code><p className="muted">Keep this URL private — anyone with it can read the studio schedule.</p></details></div></>:<div className="portalNotice"><b>Studio calendar feed unavailable.</b><span>Add CALENDAR_FEED_TOKEN in Vercel, or make sure the Supabase server secret is configured, then redeploy.</span></div>}</div></div></details>}
  {eng&&<EngineerBottomNav profile={ctx.profile}/>} 
 </main>
}

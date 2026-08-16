import Link from 'next/link';
import {requireStaff} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {EngineerHeader,EngineerBottomNav} from '../../../components/EngineerShell';
import AdminNav from '../../../components/AdminNav';
import {formatUkDate,formatUkMonth} from '../../../lib/dates';
export const dynamic='force-dynamic';

function validMonth(v){return /^\d{4}-\d{2}$/.test(String(v||''))}
function addMonth(ym,delta){const [y,m]=ym.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`}
function monthBounds(ym){const [y,m]=ym.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate();return {start:`${ym}-01`,end:`${ym}-${String(last).padStart(2,'0')}`,days:last}}
function weekdayMonday(date){const d=new Date(`${date}T12:00:00Z`).getUTCDay();return (d+6)%7}

export default async function CalendarPage({searchParams}){
 const ctx=await requireStaff(),sp=await searchParams,db=getAdminDb(),now=new Date();
 const current=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
 const month=validMonth(sp?.month)?sp.month:current,{start,end,days}=monthBounds(month),eng=ctx.profile.role==='engineer';
 let q=db.from('bookings').select('id,booking_date,start_time,end_time,service_name,status,payment_status,engineer_user_id,customers(id,full_name,artist_name)').gte('booking_date',start).lte('booking_date',end).neq('status','cancelled').order('booking_date').order('start_time');
 if(eng)q=q.eq('engineer_user_id',ctx.user.id);
 const [{data:bookings=[]},{data:blockouts=[]}]=await Promise.all([
  q,
  eng?Promise.resolve({data:[]}):db.from('blockouts').select('id,booking_date,start_time,end_time,reason').gte('booking_date',start).lte('booking_date',end).order('booking_date').order('start_time')
 ]);
 const byDate={};for(const b of bookings)(byDate[b.booking_date]??=[]).push({...b,kind:'booking'});
 for(const b of blockouts)(byDate[b.booking_date]??=[]).push({...b,kind:'blockout'});
 const firstPad=weekdayMonday(start),cells=[...Array(firstPad).fill(null),...Array.from({length:days},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)];
 while(cells.length%7)cells.push(null);
 return <main className={eng?'engApp calendarApp':'adminPage calendarApp'}>
  {eng?<EngineerHeader profile={ctx.profile} eyebrow="Calendar"/>:<header className="adminHeader"><div><p className="eyebrow">Studio schedule</p><h1>Calendar.</h1><p className="muted">One visual view of bookings and blocked studio time.</p></div><AdminNav profile={ctx.profile}/></header>}
  <section className={eng?'engWelcome compact':'adminSection calendarTop'}>
   <div className="calendarMonthNav"><Link href={`/admin/calendar?month=${addMonth(month,-1)}`}>←</Link><div><p className="eyebrow">Schedule</p><h2>{formatUkMonth(month)}</h2></div><Link href={`/admin/calendar?month=${addMonth(month,1)}`}>→</Link></div>
   <div className="calendarActions"><Link className="button primary" href="/admin/bookings/new">+ New booking</Link><Link className="button outline" href="/admin/sessions">Session reports</Link></div>
  </section>
  <section className={eng?'engSection':'adminSection'}>
   <div className="calendarWeekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div>
   <div className="studioCalendar">{cells.map((date,i)=>{
    if(!date)return <div className="calendarCell blank" key={`b${i}`}/>;
    const items=byDate[date]||[];
    return <div className={`calendarCell ${date===new Date().toISOString().slice(0,10)?'today':''}`} key={date}>
      <div className="calendarDate"><b>{Number(date.slice(-2))}</b><small>{formatUkDate(date,{short:true})}</small></div>
      <div className="calendarItems">{items.map(item=>item.kind==='blockout'
       ?<div className="calendarEvent blockout" key={item.id}><b>{String(item.start_time).slice(0,5)}–{String(item.end_time).slice(0,5)}</b><span>{item.reason||'Blocked'}</span></div>
       :<Link href={`/admin/engineer/session/${item.id}`} className="calendarEvent" key={item.id}><b>{String(item.start_time).slice(0,5)}–{String(item.end_time).slice(0,5)}</b><span>{item.customers?.artist_name||item.customers?.full_name}</span><small>{item.service_name}</small></Link>)}</div>
    </div>
   })}</div>
  </section>
  {eng&&<EngineerBottomNav profile={ctx.profile}/>}
 </main>
}
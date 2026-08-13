import Link from 'next/link';
import {requireStaff} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {EngineerHeader,EngineerBottomNav} from '../../../components/EngineerShell';
export const dynamic='force-dynamic';
export default async function EngineerHome(){
 const ctx=await requireStaff(); const db=getAdminDb(); const today=new Date().toISOString().slice(0,10);
 let q=db.from('bookings').select('*,customers(id,full_name,artist_name,email,phone)').eq('booking_date',today).in('status',['pending','confirmed']).order('start_time');
 if(ctx.profile.role==='engineer')q=q.eq('engineer_user_id',ctx.user.id);
 const [{data:todayBookings=[]},{data:recent=[]}]=await Promise.all([
   q,
   db.from('session_reports').select('id,artist_name,session_date,actual_hours').eq('submitted_by_user_id',ctx.user.id).order('created_at',{ascending:false}).limit(3)
 ]);
 const first=(ctx.profile.full_name||'').split(' ')[0];
 return <main className="engApp">
   <EngineerHeader profile={ctx.profile}/>
   <section className="engWelcome"><p className="eyebrow">Today</p><h1>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {first}.</h1><p>Everything you need to run the room.</p></section>
   <section className="engSection">
     <div className="engSectionHead"><div><h2>Today’s sessions</h2><p>{todayBookings.length?`${todayBookings.length} session${todayBookings.length===1?'':'s'} assigned`:'Nothing booked yet'}</p></div><span className="engCount">{todayBookings.length}</span></div>
     <div className="engSessionStack">{todayBookings.length?todayBookings.map(b=><article className="engSessionCard" key={b.id}>
       <div className="engSessionMeta"><span className="statusDot"></span><b>{String(b.start_time).slice(0,5)}</b><small>{b.duration_minutes/60} hr</small></div>
       <div className="engSessionMain"><h3>{b.customers?.artist_name||b.customers?.full_name}</h3><p>{b.service_name}</p><Link href={`/admin/engineer/session/${b.id}`} className="engPrimaryAction">Start session <span>→</span></Link></div>
     </article>):<div className="engEmpty"><div>✦</div><b>No sessions assigned today.</b><p>For a walk-in, register the artist first, then take payment and log the session.</p></div>}</div>
   </section>
   <section className="engSection"><h2>Quick actions</h2><div className="engQuickGrid">
     <Link href="/admin/artists?new=1" className="engQuick primary"><span>＋</span><div><b>New artist</b><small>Register a client</small></div></Link>
     <Link href="/admin/payments" className="engQuick"><span>£</span><div><b>Take payment</b><small>Session or hours</small></div></Link>
     <Link href="/admin/artists" className="engQuick"><span>⌕</span><div><b>Find artist</b><small>Profile & history</small></div></Link>
     <Link href="/admin/sessions" className="engQuick"><span>✓</span><div><b>Log session</b><small>Complete report</small></div></Link>
   </div></section>
   {recent.length>0&&<section className="engSection"><div className="engSectionHead"><div><h2>Recently completed</h2><p>Your last reports</p></div></div>{recent.map(r=><div className="engRecent" key={r.id}><div><b>{r.artist_name}</b><small>{r.session_date}</small></div><span>{r.actual_hours}h</span></div>)}</section>}
   <EngineerBottomNav/>
 </main>
}

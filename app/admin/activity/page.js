import {formatUkDateTime} from '../../../lib/dates';
import AdminNav from '../../../components/AdminNav';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';
function label(v){return String(v||'').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase())}
export default async function Activity(){
 const ctx=await requireOwner(),db=getAdminDb();
 const {data:events=[]}=await db.from('booking_events').select('*').order('created_at',{ascending:false}).limit(250);
 return <main className="adminPage">
  <header className="adminHeader"><div><p className="eyebrow">Audit trail</p><h1>Activity.</h1><p className="muted">A permanent record of cancellations, no-shows, refunds and test-data deletion.</p></div><AdminNav profile={ctx.profile}/></header>
  <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Booking lifecycle</p><h2>Recent activity</h2></div><span className="attentionCount">{events.length}</span></div>
   <div className="activityList">{events.length?events.map(e=><article className="activityRow" key={e.id}><div className={`activityIcon ${e.event_type}`}>•</div><div><div className="activityTitle"><b>{label(e.event_type)}</b><span>{formatUkDateTime(e.created_at)}</span></div><p>{e.snapshot?.customers?.artist_name||e.snapshot?.customers?.full_name||e.snapshot?.service_name||'Booking'}{e.reason_code?` · ${label(e.reason_code)}`:''}</p>{e.note&&<small>{e.note}</small>}<small>{e.actor_name?`By ${e.actor_name} · ${e.actor_role}`:'System event'}{e.booking_id?` · ${String(e.booking_id).slice(0,8).toUpperCase()}`:''}</small></div></article>):<div className="allClear">No lifecycle events recorded yet.</div>}</div>
  </section>
 </main>;
}

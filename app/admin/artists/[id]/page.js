import {formatUkDate} from '../../../../lib/dates';
import Link from 'next/link';
import AdminNav from '../../../../components/AdminNav';
import {EngineerHeader,EngineerBottomNav} from '../../../../components/EngineerShell';
import {requireStaff} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {formatGBP} from '../../../../lib/services';
import {DeleteTestCustomer} from '../../../../components/AdminActions';
export const dynamic='force-dynamic';
export default async function ArtistProfile({params}){
 const ctx=await requireStaff(); const {id}=await params; const db=getAdminDb();
 const [{data:c},{data:reports=[]},{data:payments=[]},{data:credits=[]}]=await Promise.all([db.from('customers').select('*,bookings(*)').eq('id',id).single(),db.from('session_reports').select('*').eq('customer_id',id).order('session_date',{ascending:false}).limit(20),db.from('studio_payments').select('*').eq('customer_id',id).order('created_at',{ascending:false}).limit(20),db.from('credit_ledger').select('hours_delta').eq('customer_id',id)]);
 if(!c)return <main className="engApp"><h1>Artist not found</h1></main>;
 const hours=(c.bookings||[]).filter(b=>!['cancelled','no_show'].includes(b.status)).reduce((s,b)=>s+b.duration_minutes/60,0); const noShows=(c.bookings||[]).filter(b=>b.status==='no_show').length; const bookingSpend=(c.bookings||[]).filter(b=>b.payment_status==='paid').reduce((s,b)=>s+b.amount_pence,0); const directSpend=payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount_pence,0); const balance=credits.reduce((s,x)=>s+Number(x.hours_delta||0),0); const eng=ctx.profile.role==='engineer';
 return <main className={eng?'engApp':'engineerApp'}>{eng?<EngineerHeader profile={ctx.profile} eyebrow="Artist"/>:<header className="mobileTop"><div><p className="eyebrow">Artist profile</p><h1>{c.artist_name||c.full_name}</h1></div><AdminNav profile={ctx.profile}/></header>}
   <section className="engProfileHero"><Link href="/admin/artists" className="backLink">← Artists</Link><div className="engProfileIdentity"><div className="engAvatar xl">{(c.artist_name||c.full_name||'?').slice(0,1).toUpperCase()}</div><div><p className="eyebrow">Artist profile</p><h1>{c.artist_name||c.full_name}</h1><p>{c.full_name} · {c.preferred_genre||'Genre not set'}</p></div></div></section>
   <section className="engProfileStats"><div><small>Credits</small><b>{balance}h</b></div><div><small>Sessions</small><b>{reports.length}</b></div><div className={noShows>=2?'attentionMetric':''}><small>No-shows</small><b>{noShows}</b></div>{!eng&&<div><small>Lifetime spend</small><b>{formatGBP(bookingSpend+directSpend)}</b></div>}</section>
   <section className="engActionStrip"><Link className="engPrimaryAction" href={`/admin/payments?customer=${c.id}`}>Take payment <span>→</span></Link><Link className="engSecondaryAction" href={`/admin/payments?customer=${c.id}&package=5`}>Sell hours</Link><Link className="engSecondaryAction" href="/admin/sessions">Log session</Link></section>
   <section className="engSection"><div className="engSectionHead"><div><h2>Details</h2><p>What you need in the room.</p></div></div><div className="engDetails"><div><small>Phone</small><b>{c.phone||'—'}</b></div><div><small>Email</small><b>{c.email||'—'}</b></div><div><small>Postcode</small><b>{c.postcode||'—'}</b></div><div><small>Instagram</small><b>{c.instagram||'—'}</b></div><div className="wide"><small>Goals</small><p>{c.goals||'No goals recorded yet.'}</p></div></div></section>
   <section className="engSection"><div className="engSectionHead"><div><h2>Recent sessions</h2><p>Context before the next one.</p></div></div>{reports.length?reports.slice(0,6).map(r=><article className="engHistoryRow" key={r.id}><div><b>{formatUkDate(r.session_date)}</b><small>{r.actual_hours}h · {r.engineer}</small></div><p>{r.work_completed||'Session logged.'}</p></article>):<div className="engEmpty"><b>No session reports yet.</b></div>}</section>{ctx.profile.role==='owner'&&<section className="engSection dangerSection"><p className="eyebrow">Test data</p><h2>Delete test artist</h2><p className="muted">Only test artists whose bookings are all £1 or less can be hard-deleted. Refund any paid test bookings first.</p><DeleteTestCustomer id={c.id}/></section>}
   {eng&&<EngineerBottomNav profile={ctx.profile}/>}</main>
}

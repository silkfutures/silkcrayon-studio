import {formatUkDateTime} from '../../../../../lib/dates';
import Link from 'next/link';
import {requireStaff} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {formatGBP} from '../../../../../lib/services';
import {EngineerHeader,EngineerBottomNav} from '../../../../../components/EngineerShell';
import SessionLifecycleActions from '../../../../../components/SessionLifecycleActions';
import SessionUpsellPanel from '../../../../../components/SessionUpsellPanel';
export const dynamic='force-dynamic';
export default async function SessionFlow({params}){
 const ctx=await requireStaff(); const {id}=await params; const db=getAdminDb();
 const [{data:b},{data:events=[]}]=await Promise.all([db.from('bookings').select('*,customers(*)').eq('id',id).single(),db.from('booking_events').select('*').eq('booking_id',id).order('created_at',{ascending:false}).limit(12)]);
 if(!b)return <main className="engApp"><EngineerHeader profile={ctx.profile}/><div className="engEmpty"><b>Session not found.</b><Link href="/admin/engineer">Back to today</Link></div><EngineerBottomNav profile={ctx.profile}/></main>;
 if(ctx.profile.role==='engineer'&&b.engineer_user_id&&b.engineer_user_id!==ctx.user.id)return <main className="engApp"><EngineerHeader profile={ctx.profile}/><div className="engEmpty"><b>This session is assigned to another engineer.</b></div><EngineerBottomNav profile={ctx.profile}/></main>;
 const c=b.customers; const paid=b.payment_status==='paid';
 return <main className="engApp">
   <EngineerHeader profile={ctx.profile} eyebrow="Live session"/>
   <section className="engFlowHero"><Link href="/admin/engineer" className="backLink">← Today</Link><div className={`engLiveBadge ${b.status}`}><span></span> {String(b.status).replaceAll('_',' ').toUpperCase()}</div><h1>{c?.artist_name||c?.full_name}</h1><p>{String(b.start_time).slice(0,5)}–{String(b.end_time).slice(0,5)} · {b.duration_minutes/60} hr · {b.service_name}</p></section>
   <section className="engFlowCard"><div className="engFlowTitle"><span>01</span><div><h2>Artist</h2><p>Know who’s in the room.</p></div><Link href={`/admin/artists/${c?.id}`}>View profile →</Link></div><div className="engArtistSummary"><div className="engAvatar big">{(c?.artist_name||c?.full_name||'?').slice(0,1).toUpperCase()}</div><div><b>{c?.artist_name||c?.full_name}</b><small>{c?.preferred_genre||'Genre not set'} · {c?.phone||c?.email}</small></div></div>{b.preferred_engineer_name&&<div className="preferredEngineerNote"><b>★ Preferred engineer</b><span>{b.preferred_engineer_name}{b.engineer_user_id&&b.preferred_engineer_user_id!==b.engineer_user_id?' · current assignment differs':''}</span></div>}</section>
   <section className="engFlowCard"><div className="engFlowTitle"><span>02</span><div><h2>Payment</h2><p>Make sure the session is covered.</p></div></div><div className={`engPaymentState ${paid?'paid':'due'}`}><div><small>{paid?'PAID':'AMOUNT DUE'}</small><b>{formatGBP(b.amount_pence)}</b></div><span>{paid?'✓':'!'}</span></div>{!paid&&<Link href={`/admin/payments?customer=${c?.id}&amount=${(b.amount_pence/100).toFixed(2)}&description=${encodeURIComponent(b.service_name)}`} className="engPrimaryAction">Take payment <span>→</span></Link>}</section>
   {['pending','confirmed'].includes(b.status)&&<section className="engFlowCard"><div className="engFlowTitle"><span>03</span><div><h2>Finish the session</h2><p>Report, save files, then set up the next move.</p></div></div><Link href={`/admin/sessions?booking=${b.id}`} className="engPrimaryAction">Complete session report <span>→</span></Link><SessionUpsellPanel customerId={c?.id}/></section>}
   <section className="engFlowCard"><SessionLifecycleActions booking={b} role={ctx.profile.role}/></section>
   {events.length>0&&<section className="engFlowCard"><div className="engFlowTitle"><span>↻</span><div><h2>Activity</h2><p>Permanent booking history.</p></div></div><div className="miniTimeline">{events.map(e=><div key={e.id}><span></span><p><b>{String(e.event_type).replaceAll('_',' ')}</b><small>{formatUkDateTime(e.created_at)}{e.reason_code?` · ${String(e.reason_code).replaceAll('_',' ')}`:''}</small>{e.note&&<em>{e.note}</em>}</p></div>)}</div></section>}
   <EngineerBottomNav profile={ctx.profile}/>
 </main>
}

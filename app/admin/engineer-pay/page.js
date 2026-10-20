import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {formatGBP} from '../../../lib/services';
import {formatUkDate} from '../../../lib/dates';
import {payoutLabel} from '../../../lib/engineerWorkRules';
import StripeBalanceBox from '../../../components/StripeBalanceBox';
import EngineerPayoutActions from '../../../components/EngineerPayoutActions';
import s from '../../../components/EngineerWork.module.css';
export const dynamic='force-dynamic';

const ORDER={needs_approval:0,failed:1,on_hold:2,processing:3,pending:4,paid:5,cancelled:6};
export default async function EngineerPay({searchParams}){
 const ctx=await requireOwner(),db=getAdminDb(),sp=await searchParams;
 const showAll=sp?.view==='all';
 const [{data:payouts=[]},{data:staff=[]}]=await Promise.all([
  db.from('engineer_payouts').select('*,bookings(id,booking_date,start_time,end_time,duration_minutes,service_name,payment_method,payment_status,customers(artist_name,full_name)),session_reports(actual_hours,issues_flagged,issues_note)').order('created_at',{ascending:false}).limit(showAll?500:150),
  db.from('staff_profiles').select('user_id,full_name,engineer_name,role,active,engineer_pay_hourly_pence,engineer_supported_pay_hourly_pence,stripe_connect_account_id,stripe_transfers_active').eq('role','engineer').order('full_name')
 ]);
 const rows=(payouts||[]).filter(p=>showAll||p.status!=='cancelled').sort((a,b)=>(ORDER[a.status]-ORDER[b.status])||String(b.created_at).localeCompare(String(a.created_at)));
 const attention=rows.filter(p=>['needs_approval','failed','on_hold'].includes(p.status));
 const month=new Date().toISOString().slice(0,7);
 const paidMonth=rows.filter(p=>p.status==='paid'&&String(p.paid_at||'').startsWith(month)).reduce((n,p)=>n+p.amount_pence,0);
 const scheduled=rows.filter(p=>['pending','processing'].includes(p.status)).reduce((n,p)=>n+p.amount_pence,0);
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Silkcrayon OS</p><h1>Engineer pay</h1><p className="muted">Routine sessions pay themselves. Only exceptions land here for you.</p></div><AdminNav profile={ctx.profile}/></header>
  <section className="adminSection"><div className={s.stats}><div><small>Needs you</small><b>{attention.length}</b></div><div><small>Scheduled</small><b data-sensitive="financial">{formatGBP(scheduled)}</b></div><div><small>Paid this month</small><b data-sensitive="financial">{formatGBP(paidMonth)}</b></div><div><small>Engineers set up</small><b>{(staff||[]).filter(x=>x.active&&x.stripe_transfers_active).length}/{(staff||[]).filter(x=>x.active).length}</b></div></div>
   <StripeBalanceBox/>
   <p className="muted">Card bookings pay the engineer automatically out of that booking’s own card payment. Cash, bank-transfer and prepaid-hours sessions <b>never</b> pay automatically: they wait here for you to choose <b>Pay via Stripe</b> (from your Stripe balance) or <b>Mark as paid outside Stripe</b> (you paid them yourself — Stripe will never send it).</p></section>
  <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Payouts</p><h2>{attention.length?'Needs your attention first':'All payouts'}</h2></div><Link className="button outline" href={showAll?'/admin/engineer-pay':'/admin/engineer-pay?view=all'}>{showAll?'Hide cancelled':'Show everything'}</Link></div>
   <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Engineer</th><th>Session</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
   {rows.length?rows.map(p=>{const b=p.bookings,r=p.session_reports;return <tr key={p.id}>
    <td><b>{p.engineer_name}</b><small>{p.kind==='extra_time'?'Extra time':p.kind==='manual'?'Manual':'Session fee'}</small></td>
    <td>{b?<Link className="textLink" href={`/admin/engineer/session/${b.id}`}>{b.customers?.artist_name||b.customers?.full_name}</Link>:'—'}<small>{b?`${formatUkDate(b.booking_date)} · ${String(b.start_time).slice(0,5)} · ${Number(b.duration_minutes)/60}h booked`:''}{r?` · ${Number(r.actual_hours)}h reported`:''}</small>{b&&<small>Customer paid via {b.payment_method||'—'} · {b.payment_status}</small>}</td>
    <td data-sensitive="financial"><b>{formatGBP(p.amount_pence)}</b><small>{p.hours?`${Number(p.hours)}h`:''}{p.hourly_pence!=null?` × ${formatGBP(p.hourly_pence)}`:''}</small></td>
    <td><span className={`${s.pill} ${s[p.status]||''}`}>{payoutLabel(p)}</span>{p.note&&<small>{p.note}</small>}{p.last_error&&p.status!=='paid'&&<small>{p.last_error}</small>}{p.status==='pending'&&<small>Sends after {new Date(p.release_after).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small>}{p.status==='paid'&&<small>{p.paid_at?formatUkDate(p.paid_at.slice(0,10)):''} · {p.paid_via==='outside_stripe'?`paid outside Stripe${p.paid_outside_note?` — ${p.paid_outside_note}`:''}`:p.stripe_transfer_id}</small>}{p.status==='failed'&&p.next_attempt_at&&<small>Next retry {new Date(p.next_attempt_at).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})} · attempt {p.attempts}</small>}</td>
    <td><EngineerPayoutActions payout={p}/></td>
   </tr>;}):<tr><td colSpan="5">No engineer payouts yet. They appear when an engineer completes a session report.</td></tr>}
   </tbody></table></div></section>
  <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Team</p><h2>Pay rates & payout setup</h2><p className="muted">Set each engineer’s rate on their staff profile.</p></div></div>
   <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Engineer</th><th>Standard</th><th>Supported artists</th><th>Payout setup</th><th></th></tr></thead><tbody>
   {(staff||[]).filter(x=>x.active).map(x=><tr key={x.user_id}><td><b>{x.engineer_name||x.full_name}</b></td><td data-sensitive="financial">{x.engineer_pay_hourly_pence==null?'Not set':`${formatGBP(x.engineer_pay_hourly_pence)}/h`}</td><td data-sensitive="financial">{x.engineer_supported_pay_hourly_pence==null?'Same as standard':`${formatGBP(x.engineer_supported_pay_hourly_pence)}/h`}</td><td><span className={`${s.pill} ${x.stripe_transfers_active?s.paid:x.stripe_connect_account_id?s.on_hold:s.failed}`}>{x.stripe_transfers_active?'Ready':x.stripe_connect_account_id?'Started':'Not started'}</span></td><td><Link className="textLink" href={`/admin/staff/${x.user_id}`}>Edit rate →</Link></td></tr>)}
   </tbody></table></div></section>
 </main>;
}

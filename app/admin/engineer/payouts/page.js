import Link from 'next/link';
import {requireStaff} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {formatGBP} from '../../../../lib/services';
import {formatUkDate} from '../../../../lib/dates';
import {refreshConnectStatus} from '../../../../lib/engineerPayouts';
import {PAYOUT_STATUS_LABELS} from '../../../../lib/engineerWorkRules';
import {EngineerHeader,EngineerBottomNav} from '../../../../components/EngineerShell';
import PayoutSetupButton from '../../../../components/PayoutSetupButton';
import s from '../../../../components/EngineerWork.module.css';
export const dynamic='force-dynamic';

export default async function MyEarnings({searchParams}){
 const ctx=await requireStaff(),db=getAdminDb(),sp=await searchParams;
 // Coming back from Stripe (or any visit while setup is unfinished): pull the latest account status.
 let me=ctx.profile;
 if(me.stripe_connect_account_id&&(!me.stripe_transfers_active||sp?.setup==='done'))me=await refreshConnectStatus(db,ctx.user.id)||me;
 const {data:payouts=[]}=await db.from('engineer_payouts').select('*,bookings(booking_date,start_time,end_time,service_name,customers(artist_name,full_name))').eq('engineer_user_id',ctx.user.id).neq('status','cancelled').order('created_at',{ascending:false}).limit(100);
 const rows=payouts||[];
 const paid=rows.filter(p=>p.status==='paid'),waiting=rows.filter(p=>p.status!=='paid');
 const month=new Date().toISOString().slice(0,7);
 const paidMonth=paid.filter(p=>String(p.paid_at||'').startsWith(month)).reduce((n,p)=>n+p.amount_pence,0);
 const owed=waiting.reduce((n,p)=>n+p.amount_pence,0);
 const ready=me.stripe_transfers_active;
 return <main className="engApp"><EngineerHeader profile={ctx.profile} eyebrow="My earnings"/>
  <section className="engWelcome compact"><Link href="/admin/engineer" className="backLink">← Today</Link><p className="eyebrow">Engineer pay</p><h1>My earnings.</h1><p>Session fees are paid to your bank through Stripe after you complete the session report.</p></section>
  <section className="engSection"><div className={s.setupCard}>
   {ready?<><h2>✓ Payouts are set up</h2><p className={s.muted}>Payments are sent automatically after each completed session. They reach your bank on your Stripe payout schedule; Instant Payouts may be available in your Stripe dashboard (Stripe fees apply).</p><div className={s.row}><a className={s.secondary} href="/api/engineer/payouts/dashboard">Open my Stripe dashboard ↗</a></div></>
   :<><h2>{me.stripe_connect_account_id?'Finish your payout setup':'Set up payouts'}</h2><p className={s.muted}>One-time setup with Stripe, about 5 minutes. You’ll confirm your identity and add the bank account you want paid into. Silkcrayon never sees your bank details.</p>{sp?.setup==='done'&&<p className={s.message}>Stripe is still checking your details — this page updates once they’re approved. You can also come back later.</p>}{sp?.setup==='error'&&<p className={s.message}>Something went wrong opening Stripe. Please try again.</p>}<PayoutSetupButton label={me.stripe_connect_account_id?'Continue setup':'Set up payouts'}/></>}
  </div></section>
  <section className="engSection"><div className={s.stats}><div><small>Paid this month</small><b data-sensitive="financial">{formatGBP(paidMonth)}</b></div><div><small>On the way</small><b data-sensitive="financial">{formatGBP(owed)}</b></div><div><small>Sessions paid</small><b>{paid.length}</b></div><div><small>Awaiting</small><b>{waiting.length}</b></div></div></section>
  <section className="engSection"><div className="engSectionHead"><div><h2>Payment history</h2><p>Every session payment, newest first.</p></div></div>
   {rows.length?<div className={s.history}>{rows.map(p=>{const b=p.bookings;return <div className={s.historyRow} key={p.id}><span className={s.position}>£</span><div><b>{b?.customers?.artist_name||b?.customers?.full_name||'Session'}{p.kind==='extra_time'?' · extra time':''}</b><small>{b?`${formatUkDate(b.booking_date)} · ${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}`:''}{p.hours?` · ${Number(p.hours)}h`:''}</small><small data-sensitive="financial">{formatGBP(p.amount_pence)}{p.status==='paid'&&p.paid_at?` · ${p.paid_via==='outside_stripe'?'paid directly by the studio':'paid'} ${formatUkDate(p.paid_at.slice(0,10))}`:''}{p.status==='pending'?` · sends after ${new Date(p.release_after).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:''}{p.status==='needs_approval'?' · the studio is reviewing this one':''}</small></div><span className={`${s.pill} ${s[p.status]||''}`}>{p.status==='paid'&&p.paid_via==='outside_stripe'?'Paid by the studio':p.status==='needs_approval'?'With the studio':PAYOUT_STATUS_LABELS[p.status]}</span></div>;})}</div>:<div className="engEmpty"><b>No payments yet.</b><p>Complete a session report after your next session and it will appear here.</p></div>}
  </section>
  <EngineerBottomNav profile={ctx.profile}/></main>;
}

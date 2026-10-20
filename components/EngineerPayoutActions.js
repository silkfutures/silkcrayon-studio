'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';

// Owner-only exception handling for one payout line.
export default function EngineerPayoutActions({payout}){
 const router=useRouter();
 const [amount,setAmount]=useState(((Number(payout.amount_pence)||0)/100).toFixed(2)),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const offStripe=payout.funding_source==='off_stripe';
 async function act(action){
  const pounds=`£${Number(amount||0).toFixed(2)}`;
  if(action==='cancel'&&!confirm('Cancel this engineer payment? Nothing will be sent and it won’t be recorded as paid.'))return;
  if(action==='mark_paid_outside'&&!confirm(`Record that you paid ${payout.engineer_name||'the engineer'} ${pounds} yourself (cash or bank transfer)?\n\nThis closes the payout for good — Stripe will never send it.`))return;
  if((action==='approve'||action==='retry')&&offStripe&&!confirm(`Send ${pounds} to ${payout.engineer_name||'the engineer'} from your Stripe balance?\n\nOnly do this if you have NOT already paid them another way.`))return;
  setBusy(true);setMsg('Working…');
  try{const r=await fetch(`/api/admin/engineer-payouts/${payout.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action,amount:action==='cancel'?undefined:amount})});const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.ok)setMsg(j.error||'Could not update.');
   else{const st=j.result?.status;setMsg(action==='cancel'?'Cancelled.':action==='mark_paid_outside'?'Recorded as paid outside Stripe ✓':st==='paid'?'Paid via Stripe ✓':st==='on_hold'?'Approved — waiting for the engineer’s payout setup.':st==='failed'?`Approved, but Stripe said: ${j.result.error} It will retry.`:st==='needs_approval'?'Stripe couldn’t use the card payment — choose again.':'Approved — sends after the session end time ✓');router.refresh();}
  }catch{setMsg('Network problem — please retry.');}
  finally{setBusy(false);}
 }
 const canPay=['needs_approval','failed','on_hold'].includes(payout.status);
 const canClose=['pending','needs_approval','failed','on_hold'].includes(payout.status);
 if(!canPay&&!canClose)return null;
 return <div className={s.panel}>
  <div className={s.row}>
   {canClose&&<label className={s.row} data-sensitive="financial">£<input className={s.amountInput} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Amount"/></label>}
   {canPay&&<button className={s.primary} disabled={busy} onClick={()=>act(payout.status==='failed'?'retry':'approve')}>{payout.status==='failed'?'Retry via Stripe':offStripe?'Pay via Stripe':payout.status==='on_hold'?'Approve amount':'Approve & pay'}</button>}
   {canClose&&<button className={s.secondary} disabled={busy} onClick={()=>act('mark_paid_outside')}>Mark as paid outside Stripe</button>}
   {canClose&&<button className={s.danger} disabled={busy} onClick={()=>act('cancel')}>Cancel</button>}
  </div>
  {msg&&<span className={s.message} role="status">{msg}</span>}
 </div>;
}

'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';

// Owner-only exception handling for one payout line.
export default function EngineerPayoutActions({payout}){
 const router=useRouter();
 const [amount,setAmount]=useState(((Number(payout.amount_pence)||0)/100).toFixed(2)),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function act(action){
  if(action==='cancel'&&!confirm('Cancel this engineer payment? It will not be sent.'))return;
  setBusy(true);setMsg('Working…');
  try{const r=await fetch(`/api/admin/engineer-payouts/${payout.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action,amount:action==='cancel'?undefined:amount})});const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.ok)setMsg(j.error||'Could not update.');
   else{const st=j.result?.status;setMsg(action==='cancel'?'Cancelled.':st==='paid'?'Paid ✓':st==='on_hold'?'Approved — waiting for the engineer’s payout setup.':st==='failed'?`Approved, but Stripe said: ${j.result.error}`:'Approved — sends after the session end time ✓');router.refresh();}
  }catch{setMsg('Network problem — please retry.');}
  finally{setBusy(false);}
 }
 const canApprove=['needs_approval','failed','on_hold'].includes(payout.status);
 const canCancel=['pending','needs_approval','failed','on_hold'].includes(payout.status);
 if(!canApprove&&!canCancel)return null;
 return <div className={s.row}>
  {canApprove&&<><label className={s.row} data-sensitive="financial">£<input className={s.amountInput} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Amount to pay"/></label>
  <button className={s.primary} disabled={busy} onClick={()=>act(payout.status==='failed'?'retry':'approve')}>{payout.status==='failed'?'Retry now':payout.status==='on_hold'?'Approve amount':'Approve & pay'}</button></>}
  {canCancel&&<button className={s.danger} disabled={busy} onClick={()=>act('cancel')}>Cancel</button>}
  {msg&&<span className={s.message} role="status">{msg}</span>}
 </div>;
}

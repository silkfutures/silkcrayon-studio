"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function AccountingCorrectionActions({row}){
 const router=useRouter(),[open,setOpen]=useState(false),[reason,setReason]=useState('Customer never paid'),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 async function correct(){setBusy(true);setMsg('Correcting…');try{let r;if(row.source==='booking'){r=await fetch(`/api/admin/bookings/${row.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({manualPaymentStatus:'unpaid',correctionReason:reason})})}else{r=await fetch('/api/admin/accounting/correct',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paymentId:row.id,reason})})}const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not correct payment.');setMsg('Corrected ✓');setOpen(false);router.refresh()}catch(e){setMsg(e.message)}finally{setBusy(false)}}
 if(row.stripePaid)return <small className="muted">Stripe payment — refund to reverse</small>;
 return <div className="accountingCorrection"><button type="button" className="textLink correctionTrigger" onClick={()=>setOpen(v=>!v)}>{open?'Close':'Correct payment'}</button>{open&&<div className="accountingCorrectionBox"><label><span>Reason</span><input value={reason} onChange={e=>setReason(e.target.value)} maxLength="240"/></label><button type="button" className="button outline dangerOutline" disabled={busy||!reason.trim()} onClick={correct}>{busy?'Correcting…':'Void / mark unpaid'}</button><small>This removes it from collected revenue but keeps an audit record.</small></div>}{msg&&<small className={msg.includes('✓')?'paidText':'dueText'}>{msg}</small>}</div>
}

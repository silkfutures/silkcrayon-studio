'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';

// Used on the public email-link page (token) and inside Studio OS (offerId).
export default function EngineerOfferResponse({token=null,offerId=null,initialChoice=null,compact=false}){
 const router=useRouter();
 const [choice,setChoice]=useState(initialChoice==='decline'?'decline':initialChoice==='accept'?'accept':null);
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(null),[error,setError]=useState('');
 async function send(decision){
  setBusy(true);setError('');
  try{
   const url=token?`/api/engineer-offers/${encodeURIComponent(token)}`:`/api/engineer/offers/${offerId}`;
   const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision,reason})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.ok){setError(j.error||'Could not save your response.');router.refresh();}
   else{setDone(decision);router.refresh();}
  }catch{setError('Network problem — check your connection and try again.');}
  finally{setBusy(false);}
 }
 if(done==='accept')return <p className={s.message}>✓ Accepted — the session is yours. A confirmation with an Add to Calendar link is on its way.</p>;
 if(done==='decline')return <p className={s.message}>Declined. Thanks for letting us know — it’s gone to the next engineer.</p>;
 return <div className={s.panel}>
  {choice==='decline'?<>
   <label className={s.field}><span>Reason (optional)</span><textarea className={s.textarea} rows={compact?2:3} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. already booked that evening"/></label>
   <div className={s.row}><button className={s.danger} disabled={busy} onClick={()=>send('decline')}>{busy?'Saving…':'Confirm decline'}</button><button className={s.secondary} disabled={busy} onClick={()=>setChoice(null)}>Back</button></div>
  </>:<div className={s.row}>
   <button className={s.primary} disabled={busy} onClick={()=>send('accept')}>{busy?'Saving…':choice==='accept'?'Confirm — accept session':'Accept session'}</button>
   <button className={s.secondary} disabled={busy} onClick={()=>setChoice('decline')}>Decline</button>
  </div>}
  {error&&<p className={s.message} role="alert">{error}</p>}
 </div>;
}

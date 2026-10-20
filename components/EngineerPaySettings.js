'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';
const pounds=p=>p==null?'':(Number(p)/100).toFixed(2);
export default function EngineerPaySettings({engineer}){
 const router=useRouter();
 const [pay,setPay]=useState(pounds(engineer.engineer_pay_hourly_pence)),[supported,setSupported]=useState(pounds(engineer.engineer_supported_pay_hourly_pence)),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function save(e){e.preventDefault();setBusy(true);setMsg('Saving…');try{const r=await fetch(`/api/admin/staff/${engineer.user_id}/engineer-pay`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({payHourly:pay,supportedPayHourly:supported})});const j=await r.json().catch(()=>({}));setMsg(r.ok?'Saved. New offers and assignments use this rate; accepted sessions keep their agreed fee.':j.error||'Could not save.');if(r.ok)router.refresh();}catch{setMsg('Network problem — please retry.');}setBusy(false);}
 const connect=engineer.stripe_transfers_active?'✓ Payouts set up — payments are sent automatically':engineer.stripe_connect_account_id?'Payout setup started but not finished — payments wait until it is':'Payout setup not started — the engineer does this from Studio OS → My earnings';
 return <form onSubmit={save} className={s.form} style={{margin:'20px 0'}}>
  <h3 style={{margin:0}}>Engineer pay</h3>
  <p className={s.muted}>What Silkcrayon pays this engineer per booked hour. This is separate from what the customer pays.</p>
  <div className={s.settingsGrid}>
   <label className={s.field}><span>Standard sessions (£/hour)</span><input inputMode="decimal" value={pay} onChange={e=>setPay(e.target.value)} placeholder="e.g. 20.00"/><small>Leave blank if this person isn’t paid per session.</small></label>
   <label className={s.field}><span>Supported-artist sessions (£/hour)</span><input inputMode="decimal" value={supported} onChange={e=>setSupported(e.target.value)} placeholder="Same as standard"/><small>Optional. Blank = use the standard rate.</small></label>
  </div>
  <p className={s.muted}>{connect}</p>
  <div className={s.row}><button className={s.primary} disabled={busy}>{busy?'Saving…':'Save pay rate'}</button>{msg&&<span className={s.message} role="status">{msg}</span>}</div>
 </form>;
}

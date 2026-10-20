'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';
export default function InvoiceBankForm({initial}){
 const router=useRouter();
 const [v,setV]=useState({name:initial.name||'',sortCode:initial.sortCode||'',accountNumber:initial.accountNumber||'',termsDays:String(initial.termsDays??7)}),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const set=k=>e=>setV(x=>({...x,[k]:e.target.value}));
 async function save(e){e.preventDefault();setBusy(true);setMsg('Saving…');try{const r=await fetch('/api/admin/settings/invoice-bank',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(v)});const j=await r.json().catch(()=>({}));setMsg(r.ok?'Saved. New invoices show these details.':j.error||'Could not save.');if(r.ok)router.refresh();}catch{setMsg('Network problem — please retry.');}setBusy(false);}
 return <form onSubmit={save} className={s.form}>
  <div className={s.settingsGrid}>
   <label className={s.field}><span>Account name</span><input value={v.name} onChange={set('name')} placeholder="Silkcrayon Ltd" maxLength={70}/></label>
   <label className={s.field}><span>Sort code</span><input value={v.sortCode} onChange={set('sortCode')} placeholder="12-34-56" inputMode="numeric" maxLength={8}/></label>
   <label className={s.field}><span>Account number</span><input value={v.accountNumber} onChange={set('accountNumber')} placeholder="12345678" inputMode="numeric" maxLength={8}/></label>
   <label className={s.field}><span>Payment terms (days)</span><input type="number" min="0" max="90" value={v.termsDays} onChange={set('termsDays')}/><small>Default due date on new invoices.</small></label>
  </div>
  <p className={s.muted}>Shown on project invoices, the invoice email and the customer’s payment page. Leave all three blank to offer card payment only.</p>
  <div className={s.row}><button className={s.primary} disabled={busy}>{busy?'Saving…':'Save payment details'}</button>{msg&&<span className={s.message} role="status">{msg}</span>}</div>
 </form>;
}

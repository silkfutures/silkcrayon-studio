'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';

export function QbStatus({id,status}){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function set(next){setBusy(true);setMsg('');try{const r=await fetch('/api/admin/quickbooks',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status:next})});const j=await r.json().catch(()=>({}));if(!r.ok)setMsg(j.error||'Could not update.');else router.refresh();}catch{setMsg('Network problem.');}setBusy(false);}
 return <span className={s.row}><select className={s.select} disabled={busy} value={status} onChange={e=>set(e.target.value)} aria-label="Payment status"><option value="unrecorded">Not recorded in QuickBooks</option><option value="paid">Paid</option><option value="unpaid">Unpaid — still owed</option><option value="void">Void</option></select>{msg&&<small className={s.message}>{msg}</small>}</span>;
}

export function QbNumbering({suggested,enabled,lastQb}){
 const router=useRouter();const [next,setNext]=useState(String(suggested)),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function save(){if(!confirm(`New invoices and receipts will be numbered from ${next}. Continue?`))return;setBusy(true);setMsg('Saving…');try{const r=await fetch('/api/admin/quickbooks/numbering',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({next:Number(next)})});const j=await r.json().catch(()=>({}));setMsg(r.ok?`✓ The next invoice will be ${j.next}.`:j.error||'Could not save.');if(r.ok)router.refresh();}catch{setMsg('Network problem.');}setBusy(false);}
 return <div className={s.form}>
  <b>{enabled?'Invoice numbering is continuing from QuickBooks':'Continue your QuickBooks invoice numbers'}</b>
  <p className={s.muted}>{lastQb?`Your last QuickBooks invoice was ${lastQb}. `:''}{enabled?'Invoices and receipts get the next number automatically. You can move the next number forwards (never backwards).':'Turn this on so new OS invoices and receipts carry on from QuickBooks instead of SC-I-… numbers. Quotes keep their SC-Q numbers.'}</p>
  <div className={s.row}><label className={s.field}><span>Next number</span><input className={s.amountInput} type="number" min="1" value={next} onChange={e=>setNext(e.target.value)}/></label><button className={s.primary} disabled={busy} onClick={save}>{enabled?'Update next number':'Start numbering from here'}</button></div>
  {msg&&<p className={s.message} role="status">{msg}</p>}
 </div>;
}

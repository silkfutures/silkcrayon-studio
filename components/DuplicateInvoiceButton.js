'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';
/** Copy an invoice into a new draft and open it. */
export default function DuplicateInvoiceButton({fromInvoiceId=null,fromQuickbooksId=null,label='Duplicate',small=false}){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function go(){setBusy(true);setMsg('');try{const r=await fetch('/api/admin/invoices/duplicate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fromInvoiceId,fromQuickbooksId})});const j=await r.json().catch(()=>({}));if(r.ok&&j.id){router.push(`/admin/invoicing/${j.id}?copied=1`);return;}setMsg(j.error||'Could not duplicate.');}catch{setMsg('Network problem.');}setBusy(false);}
 return <span className={s.row}><button type="button" className={s.secondary} style={small?{padding:'6px 10px',fontSize:13}:undefined} disabled={busy} onClick={go}>{busy?'Copying…':label}</button>{msg&&<small className={s.message}>{msg}</small>}</span>;
}

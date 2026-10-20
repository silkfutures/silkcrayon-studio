'use client';
import {useState} from 'react';
import s from './EngineerWork.module.css';
export default function PayoutSetupButton({label='Set up payouts'}){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function go(){setBusy(true);setMsg('');try{const r=await fetch('/api/engineer/payouts/setup',{method:'POST'});const j=await r.json().catch(()=>({}));if(r.ok&&j.url){window.location.href=j.url;return;}setMsg(j.error||'Could not start setup.');}catch{setMsg('Network problem — please retry.');}setBusy(false);}
 return <div className={s.row}><button className={s.primary} disabled={busy} onClick={go}>{busy?'Opening Stripe…':label}</button>{msg&&<span className={s.message} role="alert">{msg}</span>}</div>;
}

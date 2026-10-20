'use client';
import {useState} from 'react';
export default function InvoicePayButton({token,label}){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function go(){setBusy(true);setMsg('');try{const r=await fetch(`/api/pay/${encodeURIComponent(token)}`,{method:'POST'});const j=await r.json().catch(()=>({}));if(r.ok&&j.url){window.location.href=j.url;return;}setMsg(j.error||'Could not open card payment.');if(j.paid)setTimeout(()=>window.location.reload(),1500);}catch{setMsg('Network problem — please try again.');}setBusy(false);}
 return <div><button className="button primary" style={{minHeight:52,fontSize:17}} disabled={busy} onClick={go}>{busy?'Opening secure checkout…':label}</button>{msg&&<p role="status" style={{marginTop:12}}>{msg}</p>}</div>;
}

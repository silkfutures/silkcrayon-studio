"use client";
import {useState} from 'react';
export default function PortalStudioOffer(){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function buy(){setBusy(true);setMsg('Opening secure checkout…');const r=await fetch('/api/customer/packages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hours:2})});const j=await r.json().catch(()=>({}));if(!r.ok){setBusy(false);return setMsg(j.error||'Could not open checkout.')}location.href=j.url}
 return <div className="portalOffer"><div><p className="eyebrow">My Studio offer</p><h3>Keep the momentum — 2 hours for <strong>£110</strong>.</h3><p>Usually £120. Add two studio hours to your balance now and use them on a future session.</p>{msg&&<small>{msg}</small>}</div><button className="button primary" disabled={busy} onClick={buy}>{busy?'Opening…':'Get 2 hours · £110 →'}</button></div>
}

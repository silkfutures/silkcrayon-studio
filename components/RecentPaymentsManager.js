'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';

function gbp(pence){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(pence||0)/100)}
function looksGenerated(value){const s=String(value||'').trim();return s.length>=18&&!/\s/.test(s)&&/^[A-Za-z0-9_-]+$/.test(s)}
function displayName(payment){const n=payment.customers?.artist_name||payment.customers?.full_name||'';if(!n||looksGenerated(n))return payment.status==='pending'?'Checkout attempt':'Customer';return n}
function ageHours(iso){return (Date.now()-new Date(iso).getTime())/36e5}

export default function RecentPaymentsManager({payments=[]}){
 const router=useRouter();
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [showAbandoned,setShowAbandoned]=useState(false);
 const {real,attempts}=useMemo(()=>{
   const real=[],attempts=[];
   for(const p of payments){
     if(['pending','expired','cancelled'].includes(p.status))attempts.push(p); else real.push(p);
   }
   return {real,attempts};
 },[payments]);
 async function removeOne(p){
   const label=displayName(p);
   if(!confirm(`Delete this ${p.status} payment record for ${label}? This cannot delete a completed Stripe payment.`))return;
   setBusy(p.id);setError('');
   try{
     const r=await fetch(`/api/admin/payments/${p.id}`,{method:'DELETE'});const j=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(j.error||'Could not delete payment.');
     router.refresh();
   }catch(e){setError(e.message)}finally{setBusy('')}
 }
 async function clearAbandoned(){
   if(!confirm('Delete expired/cancelled checkout attempts and pending checkouts older than 24 hours? Completed payments are protected.'))return;
   setBusy('clear');setError('');
   try{
     const r=await fetch('/api/admin/payments?clear=abandoned',{method:'DELETE'});const j=await r.json().catch(()=>({}));
     if(!r.ok)throw new Error(j.error||'Could not clear abandoned payments.');
     router.refresh();
   }catch(e){setError(e.message)}finally{setBusy('')}
 }
 return <>
   <section className="engSection"><div className="engSectionHead"><div><h2>Recent payments</h2><p>Money that actually moved or was formally reversed.</p></div></div>
     <div className="engArtistList">{real.length?real.slice(0,8).map(p=><div key={p.id} className="engArtistRow paymentRow"><div className="engAvatar">£</div><div><b>{displayName(p)}</b><small>{p.description} · {String(p.status).replaceAll('_',' ')}</small></div><span>{gbp(p.amount_pence)}</span></div>):<div className="engEmptyState"><b>No completed payments yet.</b><p>Paid transactions will appear here.</p></div>}</div>
   </section>
   <section className="engSection paymentAttemptsSection">
    <button type="button" className="paymentAttemptsToggle" onClick={()=>setShowAbandoned(v=>!v)} aria-expanded={showAbandoned}>
      <span><b>Pending / abandoned checkouts</b><small>{attempts.length} checkout attempt{attempts.length===1?'':'s'} · not counted as revenue</small></span><span>{showAbandoned?'−':'+'}</span>
    </button>
    {showAbandoned&&<div className="paymentAttemptsBody">
      <div className="paymentAttemptsActions"><p>Delete obvious abandoned attempts individually, or clear anything expired/cancelled plus pending checkouts older than 24h.</p><button className="button outline small" disabled={busy==='clear'||!attempts.length} onClick={clearAbandoned}>{busy==='clear'?'Clearing…':'Clear abandoned'}</button></div>
      <div className="engArtistList">{attempts.length?attempts.map(p=><div key={p.id} className="engArtistRow paymentRow paymentAttemptRow"><div className="engAvatar">£</div><div><b>{displayName(p)}</b><small>{p.description} · {p.status}{p.status==='pending'&&ageHours(p.created_at)>=24?' · old':''}</small></div><span>{gbp(p.amount_pence)}</span><button type="button" className="paymentDeleteBtn" disabled={busy===p.id} onClick={()=>removeOne(p)}>{busy===p.id?'Deleting…':'Delete'}</button></div>):<div className="engEmptyState"><b>Nothing to clean up.</b></div>}</div>
    </div>}
    {error&&<p className="formError">{error}</p>}
   </section>
 </>
}

"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function PromotionToggle({id,active}){
 const router=useRouter(),[busy,setBusy]=useState(false);
 async function go(){setBusy(true);await fetch(`/api/admin/promotions/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({active:!active})});setBusy(false);router.refresh()}
 return <button className={`promoToggle ${active?'on':''}`} onClick={go} disabled={busy}><span/>{busy?'Saving…':active?'LIVE':'OFF'}</button>
}
export function PromotionEdit({promotion:p}){
 const router=useRouter(),[msg,setMsg]=useState('');
 async function save(e){e.preventDefault();setMsg('Saving…');const f=new FormData(e.currentTarget),body=Object.fromEntries(f.entries());const r=await fetch(`/api/admin/promotions/${p.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));setMsg(r.ok?'Saved ✓':j.error||'Could not save');if(r.ok)router.refresh()}
 return <form className="promoEdit" onSubmit={save}><div className="formGrid">
  <label className="field"><span>Badge</span><input name="badgeText" defaultValue={p.badge_text||''}/></label>
  <label className="field"><span>Banner title</span><input name="bannerTitle" defaultValue={p.banner_title||''}/></label>
  <label className="field full"><span>Banner copy</span><textarea name="bannerCopy" defaultValue={p.banner_copy||''} rows="2"/></label>
  <label className="field"><span>Offer price £</span><input name="amountPounds" type="number" step=".01" defaultValue={(p.amount_pence/100).toFixed(2)}/></label>
  <label className="field"><span>Normal price £</span><input name="listAmountPounds" type="number" step=".01" defaultValue={(p.list_amount_pence/100).toFixed(2)}/></label>
  <label className="field"><span>CTA label</span><input name="ctaLabel" defaultValue={p.cta_label||''}/></label>
  <label className="field"><span>CTA link</span><input name="ctaHref" defaultValue={p.cta_href||'/booking'}/></label>
  <label className="field"><span>Ends</span><input name="endsAt" type="datetime-local" defaultValue={p.ends_at?new Date(p.ends_at).toISOString().slice(0,16):''}/></label>
  <label className="field"><span>Priority</span><input name="priority" type="number" defaultValue={p.priority||0}/></label>
 </div><div className="promoEditActions"><button className="button outline">Save changes</button><small>{msg}</small></div></form>
}

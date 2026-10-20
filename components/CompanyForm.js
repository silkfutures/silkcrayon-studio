'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';
/** Add or edit a company you invoice. */
export default function CompanyForm({company=null}){
 const router=useRouter();
 const [v,setV]=useState({name:company?.name||'',contactName:company?.contact_name||'',email:company?.email||'',phone:company?.phone||'',address:company?.address||'',notes:company?.notes||''});
 const [open,setOpen]=useState(Boolean(company)),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const set=k=>e=>setV(x=>({...x,[k]:e.target.value}));
 async function save(e){e.preventDefault();setBusy(true);setMsg('Saving…');
  try{const r=await fetch(company?`/api/admin/companies/${company.id}`:'/api/admin/companies',{method:company?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(v)});const j=await r.json().catch(()=>({}));
   if(!r.ok){setMsg(j.error||'Could not save.');}else{setMsg('Saved ✓');if(!company){router.push(`/admin/invoicing/companies/${j.company.id}`);}router.refresh();}}
  catch{setMsg('Network problem — please retry.');}setBusy(false);}
 async function archive(){if(!confirm('Remove this company from your list? Past invoices are kept.'))return;setBusy(true);await fetch(`/api/admin/companies/${company.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'archive'})});router.push('/admin/invoicing?tab=companies');router.refresh();}
 if(!open)return <button className={s.primary} onClick={()=>setOpen(true)}>+ Add a company</button>;
 return <form onSubmit={save} className={s.form}>
  <b>{company?'Company details':'New company'}</b>
  <div className={s.settingsGrid}>
   <label className={s.field}><span>Company name</span><input required value={v.name} onChange={set('name')} placeholder="e.g. ACT Training"/></label>
   <label className={s.field}><span>Contact person (printed as FAO)</span><input value={v.contactName} onChange={set('contactName')} placeholder="e.g. Finance team"/></label>
   <label className={s.field}><span>Invoice email</span><input type="email" value={v.email} onChange={set('email')} placeholder="finance@company.co.uk"/></label>
   <label className={s.field}><span>Phone</span><input value={v.phone} onChange={set('phone')}/></label>
   <label className={s.field} style={{gridColumn:'1/-1'}}><span>Billing address</span><textarea className={s.textarea} rows={4} value={v.address} onChange={set('address')} placeholder={'Ocean Park House\nEast Tyndall Street\nCardiff CF24 5ET'}/></label>
   <label className={s.field} style={{gridColumn:'1/-1'}}><span>Notes (only you see these)</span><textarea className={s.textarea} rows={2} value={v.notes} onChange={set('notes')} placeholder="e.g. Needs a PO number on every invoice"/></label>
  </div>
  <div className={s.row}><button className={s.primary} disabled={busy}>{busy?'Saving…':company?'Save changes':'Save company'}</button>{!company&&<button type="button" className={s.secondary} onClick={()=>setOpen(false)}>Cancel</button>}{company&&<button type="button" className={s.danger} disabled={busy} onClick={archive}>Remove company</button>}{msg&&<span className={s.message} role="status">{msg}</span>}</div>
 </form>;
}

"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function ArtistEditForm({customer,label='Edit details'}){
 const router=useRouter();
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 async function submit(e){
  e.preventDefault();setSaving(true);setMessage('');
  const body=Object.fromEntries(new FormData(e.currentTarget).entries());
  if(String(body.email||'').trim().toLowerCase()!==String(customer.email||'').toLowerCase()&&!confirm(`Change this artist's email to ${body.email}? They will use the new address to sign in to My Studio and will get booking emails there.`)){setSaving(false);return;}
  try{
   const r=await fetch(`/api/admin/customers/${customer.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const j=await r.json().catch(()=>({}));
   if(!r.ok){setMessage(j.error||'Could not save artist.');return;}
   setMessage('Saved ✓');setOpen(false);router.refresh();
  }catch{setMessage('Network problem — please try again.');}
  finally{setSaving(false);}
 }
 return <div className="artistEditWrap"><button type="button" className="button outline" onClick={()=>{setOpen(v=>!v);setMessage('');}}>{open?'Close editor':label}</button>{!open&&message&&<small className="artistEditMessage" role="status">{message}</small>}{open&&<form className="artistEditForm" onSubmit={submit}><div className="formGrid">
  <label className="field"><span>Full name</span><input name="fullName" defaultValue={customer.full_name||''} required maxLength={120} autoComplete="off"/></label>
  <label className="field"><span>Artist name</span><input name="artistName" defaultValue={customer.artist_name||''} maxLength={120} autoComplete="off"/></label>
  <label className="field"><span>Email</span><input name="email" type="email" defaultValue={customer.email||''} required maxLength={254} autoComplete="off"/></label>
  <label className="field"><span>Phone</span><input name="phone" type="tel" defaultValue={customer.phone||''} placeholder="07…" maxLength={50} autoComplete="off"/></label>
  <label className="field"><span>Instagram / social</span><input name="instagram" defaultValue={customer.instagram||''} maxLength={200}/></label>
  <label className="field"><span>Genre / style</span><input name="preferredGenre" defaultValue={customer.preferred_genre||''} maxLength={120}/></label>
  <label className="field"><span>Postcode</span><input name="postcode" defaultValue={customer.postcode||''} maxLength={12}/></label>
  <label className="field"><span>Area</span><input name="area" defaultValue={customer.area||''} maxLength={120}/></label>
  <label className="field full"><span>Goals / notes</span><textarea name="goals" rows="4" defaultValue={customer.goals||''} maxLength={4000}/></label>
 </div><button className="button primary" disabled={saving}>{saving?'Saving…':'Save artist'}</button>{message&&<small className="artistEditMessage" role="status">{message}</small>}</form>}</div>
}

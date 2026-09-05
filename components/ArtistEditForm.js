"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function ArtistEditForm({customer}){
 const router=useRouter();
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 async function submit(e){
  e.preventDefault();setSaving(true);setMessage('');
  const fd=new FormData(e.currentTarget);
  const body=Object.fromEntries(fd.entries());
  const r=await fetch(`/api/admin/customers/${customer.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));setSaving(false);
  if(!r.ok)return setMessage(j.error||'Could not save artist.');
  setMessage('Saved.');setOpen(false);router.refresh();
 }
 return <div className="artistEditWrap"><button type="button" className="button outline" onClick={()=>setOpen(v=>!v)}>{open?'Close editor':'Edit artist'}</button>{open&&<form className="artistEditForm" onSubmit={submit}><div className="formGrid"><label className="field"><span>Full name</span><input name="fullName" defaultValue={customer.full_name||''} required/></label><label className="field"><span>Artist name</span><input name="artistName" defaultValue={customer.artist_name||''}/></label><label className="field"><span>Email</span><input name="email" type="email" defaultValue={customer.email||''} required/></label><label className="field"><span>Phone</span><input name="phone" type="tel" defaultValue={customer.phone||''} placeholder="07…"/></label><label className="field"><span>Instagram / social</span><input name="instagram" defaultValue={customer.instagram||''}/></label><label className="field"><span>Genre / style</span><input name="preferredGenre" defaultValue={customer.preferred_genre||''}/></label><label className="field"><span>Area</span><input name="area" defaultValue={customer.area||''}/></label><label className="field full"><span>Goals / notes</span><textarea name="goals" rows="4" defaultValue={customer.goals||''}/></label></div><button className="button primary" disabled={saving}>{saving?'Saving…':'Save artist'}</button>{message&&<small className="artistEditMessage">{message}</small>}</form>}</div>
}

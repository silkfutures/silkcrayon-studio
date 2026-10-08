"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function EngineerArtistCreate(){
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const router=useRouter();
 async function submit(e){
  e.preventDefault();if(saving)return;
  const form=e.currentTarget;
  const values=Object.fromEntries(new FormData(form).entries());
  setSaving(true);setError('');
  try{
   const response=await fetch('/api/engineer/artists',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...values,policyAccepted:values.policyAccepted==='on'})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Could not add artist.');
   form.reset();setOpen(false);router.refresh();
  }catch(err){setError(err.message)}finally{setSaving(false)}
 }
 return <section className="engSection">
  <button type="button" className="button primary" onClick={()=>setOpen(!open)}>{open?'Close':'＋ Add artist'}</button>
  {open&&<form onSubmit={submit} className="staffForm">
   <label className="field"><span>Full name</span><input name="fullName" required maxLength={120}/></label>
   <label className="field"><span>Artist name</span><input name="artistName" required maxLength={120}/></label>
   <label className="field"><span>Email</span><input name="email" type="email" required maxLength={254}/></label>
   <label className="field"><span>Phone (optional)</span><input name="phone" maxLength={40}/></label>
   <label className="field"><span><input name="policyAccepted" type="checkbox" required/> Artist has accepted Silkcrayon's No Harmful Music Policy</span></label>
   <p className="muted">Use only customer details they have agreed to share with the studio. No marketing consent is assumed.</p>
   <button className="button primary" disabled={saving}>{saving?'Saving…':'Save artist'}</button>
   {error&&<p role="alert">{error}</p>}
  </form>}
 </section>;
}
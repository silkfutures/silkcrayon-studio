"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function StaffTestDelete({id}){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const router=useRouter();
 async function remove(){
  if(!window.confirm('Permanently delete the disabled Test engineer account? This cannot be undone.'))return;
  setBusy(true);setMsg('');
  try{
   const r=await fetch(`/api/admin/staff/${encodeURIComponent(id)}/delete`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:'DELETE TEST'})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||'Delete failed.');
   router.refresh();
  }catch(e){setMsg(e.message);}finally{setBusy(false);}
 }
 return <div><button className="miniButton" type="button" disabled={busy} onClick={remove}>{busy?'Deleting…':'Delete test account'}</button>{msg&&<p role="alert" className="muted">{msg}</p>}</div>;
}
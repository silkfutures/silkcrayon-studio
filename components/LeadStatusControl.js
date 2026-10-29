'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {LEAD_STATUSES,normaliseLeadStatus} from '../lib/leadPipeline';

export default function LeadStatusControl({lead}){
 const router=useRouter();
 const [status,setStatus]=useState(normaliseLeadStatus(lead.status));
 const [error,setError]=useState('');
 const [saving,setSaving]=useState(false);
 const [,startTransition]=useTransition();
 async function move(next){
  if(next===status||saving)return;
  const previous=status;setStatus(next);setSaving(true);setError('');
  try{
   const r=await fetch(`/api/admin/leads/${lead.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||'Could not update this enquiry.');
   startTransition(()=>router.refresh());
  }catch(e){setStatus(previous);setError(e.message)}
  finally{setSaving(false)}
 }
 return <div className="leadPipeline">
  <div className="leadPipelineTrack" role="group" aria-label="Enquiry status">
   {LEAD_STATUSES.map(s=><button key={s.key} type="button" title={s.hint} aria-pressed={status===s.key} disabled={saving} className={`leadPipelineStep${status===s.key?' active':''}${s.key==='lost'?' lost':''}`} onClick={()=>move(s.key)}>{s.label}</button>)}
  </div>
  {error&&<p className="formError">{error}</p>}
 </div>;
}

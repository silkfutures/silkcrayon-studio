'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function MixManualApproveButton({jobId,status}){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 if(['approved','delivered'].includes(status))return null;
 if(!['first_mix_sent','revisions'].includes(status))return null;
 async function approve(){
  if(!window.confirm('Mark this mix as approved? Use this when the customer has approved outside the review link.'))return;
  setBusy(true);setMessage('');
  try{
   const response=await fetch(`/api/admin/mixes/${jobId}/approve`,{method:'POST'});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Could not approve mix.');
   setMessage('Mix approved ✓');
   router.refresh();
  }catch(error){setMessage(error.message||'Could not approve mix.')}finally{setBusy(false)}
 }
 return <div className="mixManualApproval"><div><p className="eyebrow">Client approval</p><h3>Customer approved elsewhere?</h3><p className="muted">Use this if they confirmed approval by text, email or in person instead of pressing the review-page button.</p></div><button type="button" className="button primary" disabled={busy} onClick={approve}>{busy?'Approving…':'Mark mix as approved ✓'}</button>{message&&<small className="muted" role="status">{message}</small>}</div>
}

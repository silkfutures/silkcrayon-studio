'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function MixDeleteButton({jobId,hasStripePayment=false}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function remove(){
    if(hasStripePayment){setMessage('Stripe-paid mixes are protected from deletion. Use a refund/accounting correction instead.');return}
    const typed=window.prompt('Delete this mix completely? This removes it from mix accounting and deletes its stored mix files. Type DELETE to continue.');
    if(typed!=='DELETE')return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/admin/mixes/${jobId}`,{method:'DELETE'});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not delete mix.');
      router.push('/admin/mixes');router.refresh();
    }catch(error){setMessage(error.message||'Could not delete mix.')}finally{setBusy(false)}
  }

  return <div className="mixDangerZone">
    <div><b>Delete test / duplicate mix</b><p>Use this for test jobs or mistakes. It removes the mix from the pipeline and mix accounting, and cleans up stored source/delivery files.</p>{hasStripePayment&&<small>A real Stripe payment is attached, so deletion is locked.</small>}</div>
    <button type="button" className="button danger" disabled={busy||hasStripePayment} onClick={remove}>{busy?'Deleting…':'Delete mix'}</button>
    {message&&<small role="status">{message}</small>}
  </div>;
}

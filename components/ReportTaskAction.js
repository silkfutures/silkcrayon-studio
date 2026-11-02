"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function ReportTaskAction({bookingId,restore=false}){
 const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function update(){
  if(!restore&&!window.confirm('Remove this unresolved report task? The booking and payment history will stay. You can restore the task from Removed reports.'))return;
  setBusy(true);setError('');
  try{
   const response=await fetch(`/api/admin/bookings/${bookingId}/report-task`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:restore?'restore':'dismiss'})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not update report task.');
   router.refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="reportTaskControl"><button type="button" className="reportTaskButton" onClick={update} disabled={busy}>{busy?'Saving…':restore?'Restore':'Remove'}</button>{error&&<small role="alert">{error}</small>}</div>;
}

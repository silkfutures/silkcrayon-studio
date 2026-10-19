'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function EngineerSupportedRate({engineer}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),router=useRouter();
 async function submit(e){e.preventDefault();setBusy(true);try{const r=await fetch(`/api/admin/staff/${engineer.user_id}/supported-rate`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({hourlyPrice:new FormData(e.currentTarget).get('hourlyPrice')})}),j=await r.json();setMessage(r.ok?'Default saved. Existing artist agreements keep their current rate.':j.error);if(r.ok)router.refresh();}catch{setMessage('Could not save. Please retry.');}finally{setBusy(false);}}
 return <form onSubmit={submit} style={{margin:'20px 0',padding:20,border:'1px solid var(--line)'}}><h3>Supported artist default</h3><label className="field"><span>Hourly rate (£)</span><input name="hourlyPrice" type="number" min="1" max="1000" step="0.01" required defaultValue={engineer.supported_hourly_price_pence/100}/></label><p>Used when approving new artists with this engineer. You can set a different rate for an individual artist.</p><button className="button primary" disabled={busy}>{busy?'Saving…':'Save default rate'}</button><p role="status">{message}</p></form>;
}

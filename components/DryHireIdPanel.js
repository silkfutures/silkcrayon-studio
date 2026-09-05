"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';

function fmt(v){if(!v)return null;try{return new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}catch{return v}}
export default function DryHireIdPanel({bookingId,customer,check}){
 const router=useRouter(),[busy,setBusy]=useState(''),[msg,setMsg]=useState('');
 const verified=Boolean(customer?.dry_hire_id_verified_at),status=verified?'verified':(check?.status||'required');
 async function act(action,extra={}){
  if(['verify','mark_in_person','reset_and_request'].includes(action)){
   const copy=action==='verify'?'Verify this ID and permanently delete the uploaded photo?':action==='mark_in_person'?'Mark this customer as ID verified in person?':'Reset the existing verification and request a new ID upload?';
   if(!window.confirm(copy))return;
  }
  setBusy(action);setMsg('Working…');
  const r=await fetch(`/api/admin/bookings/${bookingId}/dry-hire-id`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...extra})});
  const j=await r.json().catch(()=>({}));setBusy('');
  if(!r.ok)return setMsg(j.error||'Could not update ID check.');
  setMsg(action==='verify'||action==='mark_in_person'?'ID verified ✓':action==='reject'?'New ID requested ✓':'ID request sent ✓');router.refresh();
 }
 const label={verified:'Verified',submitted:'Submitted · review now',requested:'Request sent',rejected:'Needs new ID',expired:'Expired',required:'ID required'}[status]||status;
 return <div className={`dryHireIdPanel ${status}`}>
   <div className="dryHireIdPanelTop"><div><small>LEAD HIRER ID</small><h3>{label}</h3></div><span className="idStatusDot">{verified?'✓':status==='submitted'?'!':'○'}</span></div>
   {verified?<p>Verified {fmt(customer.dry_hire_id_verified_at)} · {customer.dry_hire_id_verified_method==='in_person'?'checked in person':'secure upload reviewed'}. The ID image is not retained.</p>:status==='submitted'?<p>Submitted {fmt(check?.submitted_at)}. Review it before allowing self-operated studio access.</p>:status==='requested'?<p>Secure upload request sent {fmt(check?.requested_at)}.{check?.request_email_sent_at?' Email sent.':''}{check?.request_sms_sent_at?' Text sent.':''}</p>:<p>This dry-hire customer has not yet completed ID verification.</p>}
   {check?.request_email_error&&<p className="idError">Email: {check.request_email_error}</p>}{check?.request_sms_error&&<p className="idError">SMS: {check.request_sms_error}</p>}
   <div className="dryHireIdActions">
    {!verified&&status==='submitted'&&check?.id&&<a className="engPrimaryAction" href={`/api/admin/dry-hire-id/${check.id}/view`} target="_blank" rel="noreferrer">Open ID securely <span>↗</span></a>}
    {!verified&&status==='submitted'&&<button className="engSecondaryAction" disabled={!!busy} onClick={()=>act('verify')}>Verify + delete photo</button>}
    {!verified&&status==='submitted'&&<button className="engSecondaryAction dangerLite" disabled={!!busy} onClick={()=>act('reject',{reason:'ID photo was not clear enough to verify.'})}>Reject + request new</button>}
    {!verified&&status!=='submitted'&&<button className="engPrimaryAction buttonLike" disabled={!!busy} onClick={()=>act('request')}>{status==='requested'?'Resend ID request':'Request ID'} <span>→</span></button>}
    {!verified&&<button className="engSecondaryAction" disabled={!!busy} onClick={()=>act('mark_in_person')}>Mark verified in person</button>}
    {verified&&<button className="engSecondaryAction" disabled={!!busy} onClick={()=>act('reset_and_request')}>Request new ID</button>}
   </div>
   <small className="idRetentionCopy">Uploaded ID photos are private and are deleted immediately after verification or automatically within 7 days of submission.</small>
   {msg&&<p className="deliveryMessage" aria-live="polite">{msg}</p>}
 </div>;
}

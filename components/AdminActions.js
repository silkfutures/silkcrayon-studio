"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingStatus({ id, status }) {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  async function change(next){setBusy(true);setMsg('Saving…');const r=await fetch(`/api/admin/bookings/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});setMsg(r.ok?'Saved ✓':'Could not save');router.refresh();setBusy(false);setTimeout(()=>setMsg(''),1200)}
  return <div className="inlineControl"><select aria-label="Booking status" disabled={busy} value={status} onChange={e=>change(e.target.value)}><option>pending</option><option>confirmed</option><option>completed</option><option>cancelled</option><option value="no_show">no show</option></select>{msg&&<small>{msg}</small>}</div>;
}

export function EngineerAssign({id,value,staff=[],compact=false,preferredUserId=null}){
 const router=useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
 async function change(engineerUserId){setBusy(true);setMsg('Assigning…');const r=await fetch(`/api/admin/bookings/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({engineerUserId:engineerUserId||null})});const j=await r.json().catch(()=>({}));setMsg(r.ok?(engineerUserId?'Assigned + notified ✓':'Unassigned ✓'):(j.error||'Could not assign'));router.refresh();setBusy(false);setTimeout(()=>setMsg(''),2200)}
 return <div className={`assignControl ${compact?'compact':''}`}><select aria-label="Assigned engineer" disabled={busy} value={value||''} onChange={e=>change(e.target.value)}><option value="">Assign engineer…</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{preferredUserId===s.user_id?"★ ": ""}{s.engineer_name||s.full_name}{preferredUserId===s.user_id?" — preferred":""}</option>)}</select>{msg&&<small>{msg}</small>}</div>
}

export function BlockoutForm() {
  const router = useRouter(); const [msg,setMsg]=useState("");
  async function submit(e){e.preventDefault();setMsg('Saving…');const body=Object.fromEntries(new FormData(e.currentTarget).entries());const r=await fetch('/api/admin/blockouts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();setMsg(r.ok?'Time blocked.':j.error||'Could not save');if(r.ok){e.currentTarget.reset();router.refresh();}}
  return <form className="blockoutForm" onSubmit={submit}><label>Date<input name="date" type="date" required/></label><label>Start<input name="start" type="time" required/></label><label>End<input name="end" type="time" required/></label><label>Reason<input name="reason" placeholder="Holiday / maintenance"/></label><button className="button outline">Block time</button><small>{msg}</small></form>;
}

export function ChangeRequestActions({id}){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function decide(decision){setBusy(true);setMsg(decision==='approve'?'Confirming…':'Declining…');const r=await fetch(`/api/admin/bookings/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({changeRequestDecision:decision})});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?(decision==='approve'?'Change confirmed ✓':'Request declined ✓'):(j.error||'Could not update'));if(r.ok){router.refresh();setTimeout(()=>setMsg(''),1800)}}
 return <div className="requestActions"><button className="miniButton solid" disabled={busy} onClick={()=>decide('approve')}>Confirm change</button><button className="miniButton" disabled={busy} onClick={()=>decide('decline')}>Decline</button>{msg&&<small>{msg}</small>}</div>
}

export function PaymentReconcileButton(){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function run(){setBusy(true);setMsg('Checking Stripe…');const r=await fetch('/api/admin/reconcile-payments',{method:'POST'});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?`Checked ${j.checked} · fixed ${j.paid} paid booking${j.paid===1?'':'s'} ✓`:(j.error||'Sync failed'));if(r.ok)router.refresh();}
 return <div className="reconcileControl"><button className="miniButton solid" disabled={busy} onClick={run}>{busy?'Syncing…':'Sync Stripe payments'}</button>{msg&&<small>{msg}</small>}</div>
}
export function BookingOwnerActions({booking}){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[refundOpen,setRefundOpen]=useState(false),[refundReason,setRefundReason]=useState('customer_cancelled'),[refundNote,setRefundNote]=useState('');
 async function patch(body){setBusy(true);setMsg('Working…');const r=await fetch(`/api/admin/bookings/${booking.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?'Done ✓':(j.error||'Could not update'));if(r.ok)router.refresh();}
 async function del(){if(!confirm('Delete this TEST booking record permanently? This cannot be undone.'))return;setBusy(true);const r=await fetch(`/api/admin/bookings/${booking.id}`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({reason:'test_data'})});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?'Deleted ✓':(j.error||'Could not delete'));if(r.ok)router.refresh();}
 const refundable=['paid','part_refunded'].includes(booking.payment_status)&&booking.stripe_payment_intent_id;
 return <div className="ownerBookingActions">{refundable&&<><button className="miniButton warning" disabled={busy} onClick={()=>setRefundOpen(v=>!v)}>Refund & cancel</button>{refundOpen&&<div className="inlineRefundPanel"><label>Reason<select value={refundReason} onChange={e=>setRefundReason(e.target.value)}><option value="customer_cancelled">Customer cancelled</option><option value="studio_cancelled">Studio cancelled</option><option value="duplicate">Duplicate</option><option value="booking_error">Booking error</option><option value="goodwill">Goodwill</option><option value="service_issue">Service issue</option><option value="other">Other</option></select></label><textarea rows="2" value={refundNote} onChange={e=>setRefundNote(e.target.value)} placeholder="Optional internal note"/><button className="miniButton warning" disabled={busy} onClick={()=>patch({refund:true,refundReason,refundNote})}>Confirm £{((booking.amount_pence-(booking.refunded_amount_pence||0))/100).toFixed(2)} refund</button></div>}</>}{!['cancelled','completed','no_show'].includes(booking.status)&&!refundable&&<button className="miniButton" disabled={busy} onClick={async()=>{const note=prompt('Why is this booking being cancelled?');if(note===null)return;setBusy(true);setMsg('Working…');const r=await fetch(`/api/admin/bookings/${booking.id}/lifecycle`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'cancel',reason:'other',note})});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?'Cancelled ✓':(j.error||'Could not update'));if(r.ok)router.refresh();}}>Cancel booking</button>}{Number(booking.amount_pence||0)<=100&&<button className="miniButton danger" disabled={busy} onClick={del}>Delete test booking</button>}{msg&&<small>{msg}</small>}</div>
}
export function DeleteTestCustomer({id}){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function del(){
  if(!confirm('Permanently delete this TEST artist, their eligible test bookings and linked CRM test contact? This cannot be undone.'))return;
  setBusy(true);setMsg('Deleting…');
  const r=await fetch(`/api/admin/customers/${id}`,{method:'DELETE'});const j=await r.json().catch(()=>({}));
  setBusy(false);
  if(r.ok){setMsg('Deleted permanently ✓');setTimeout(()=>{router.push('/admin/artists?deleted=1');router.refresh()},850)}
  else setMsg(j.error||'Could not delete test artist');
 }
 return <div className="dangerZone"><button className="miniButton danger" disabled={busy} onClick={del}>{busy?'Deleting…':'Delete test artist'}</button>{msg&&<small className={msg.includes('✓')?'deleteSuccess':''}>{msg}</small>}</div>
}


export function BlockoutList({items=[]}) {
  const router=useRouter(); const [busy,setBusy]=useState('');
  async function unblock(id){if(!confirm('Make this studio time available again?'))return;setBusy(id);const r=await fetch('/api/admin/blockouts',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id})});setBusy('');if(r.ok)router.refresh();else alert('Could not unblock this time.');}
  if(!items.length)return <p className="muted">No future studio time is blocked.</p>;
  return <div className="blockoutList">{items.map(x=><div className="blockoutItem" key={x.id}><div><b>{x.booking_date} · {String(x.start_time).slice(0,5)}–{String(x.end_time).slice(0,5)}</b><small>{x.reason||'Blocked time'}</small></div><button className="miniButton" disabled={busy===x.id} onClick={()=>unblock(x.id)}>{busy===x.id?'Unblocking…':'Unblock'}</button></div>)}</div>;
}


export function CancellationRequestActions({booking}){
 const router=useRouter();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [outcome,setOutcome]=useState(booking.payment_method==='credits'?'credit':'none');
 const [note,setNote]=useState('');
 async function decide(decision){
   if(decision==='decline'){
     if(!confirm('Decline this cancellation request and keep the booking confirmed?'))return;
   }else{
     const label=outcome==='refund'?'cancel and issue the card refund':outcome==='credit'?'cancel and restore studio credit':'cancel with no refund or credit';
     if(!confirm(`Confirm: ${label}?`))return;
   }
   setBusy(true);setMsg('Working…');
   const r=await fetch(`/api/admin/bookings/${booking.id}`,{
     method:'PATCH',headers:{'content-type':'application/json'},
     body:JSON.stringify({cancellationRequestDecision:decision,cancellationOutcome:outcome,cancellationNote:note})
   });
   const j=await r.json().catch(()=>({}));
   setBusy(false);
   if(r.ok){setMsg(decision==='decline'?'Request declined ✓':'Cancellation completed ✓');router.refresh()}
   else setMsg(j.error||'Could not resolve cancellation');
 }
 const remaining=Math.max(0,Number(booking.amount_pence||0)-Number(booking.refunded_amount_pence||0));
 const hours=Number(booking.duration_minutes||0)/60;
 return <div className="cancelRequestActions">
   <button className="miniButton solid" disabled={busy} onClick={()=>setOpen(v=>!v)}>{open?'Close':'Review request'}</button>
   {open&&<div className="cancelDecisionPanel">
     <div className="cancelPolicyHint"><b>Choose the outcome yourself.</b><span>The system will not refund or credit anything until you confirm.</span></div>
     <label>Resolution
       <select value={outcome} onChange={e=>setOutcome(e.target.value)}>
         {booking.payment_method!=='credits'&&booking.stripe_payment_intent_id&&remaining>0&&<option value="refund">Cancel + refund £{(remaining/100).toFixed(2)}</option>}
         <option value="credit">Cancel + studio credit {hours.toFixed(hours%1?1:0)}h</option>
         <option value="none">Cancel · no refund / credit</option>
       </select>
     </label>
     <label>Internal / customer note
       <textarea rows="2" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional reason or context"/>
     </label>
     <div className="cancelDecisionButtons">
       <button className="miniButton warning" disabled={busy} onClick={()=>decide('approve')}>Confirm cancellation</button>
       <button className="miniButton" disabled={busy} onClick={()=>decide('decline')}>Decline request</button>
       <a className="miniButton" href={`/admin/engineer/session/${booking.id}`}>Open booking</a>
     </div>
   </div>}
   {msg&&<small>{msg}</small>}
 </div>
}

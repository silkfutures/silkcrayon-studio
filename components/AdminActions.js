"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingStatus({ id, status }) {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  async function change(next){setBusy(true);setMsg('Saving…');const r=await fetch(`/api/admin/bookings/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});setMsg(r.ok?'Saved ✓':'Could not save');router.refresh();setBusy(false);setTimeout(()=>setMsg(''),1200)}
  return <div className="inlineControl"><select aria-label="Booking status" disabled={busy} value={status} onChange={e=>change(e.target.value)}><option>pending</option><option>confirmed</option><option>completed</option><option>cancelled</option><option value="no_show">no show</option></select>{msg&&<small>{msg}</small>}</div>;
}

export function EngineerAssign({id,value,staff=[],compact=false}){
 const router=useRouter(); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
 async function change(engineerUserId){setBusy(true);setMsg('Assigning…');const r=await fetch(`/api/admin/bookings/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({engineerUserId:engineerUserId||null})});const j=await r.json().catch(()=>({}));setMsg(r.ok?(engineerUserId?'Assigned + notified ✓':'Unassigned ✓'):(j.error||'Could not assign'));router.refresh();setBusy(false);setTimeout(()=>setMsg(''),2200)}
 return <div className={`assignControl ${compact?'compact':''}`}><select aria-label="Assigned engineer" disabled={busy} value={value||''} onChange={e=>change(e.target.value)}><option value="">Assign engineer…</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.engineer_name||s.full_name}</option>)}</select>{msg&&<small>{msg}</small>}</div>
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

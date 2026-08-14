"use client";
import {useEffect,useMemo,useState} from "react";
function days(){return Array.from({length:21},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i+1);return d})}
function iso(d){return d.toISOString().slice(0,10)}
export default function BookingManage({booking,cutoffHours}){
 const quick=useMemo(()=>days(),[]),[date,setDate]=useState(booking.booking_date),[slots,setSlots]=useState([]),[slot,setSlot]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState('');
 useEffect(()=>{fetch(`/api/availability?date=${date}&service=${booking.service_slug}&duration=${booking.duration_minutes}`).then(r=>r.json()).then(j=>setSlots(j.slots||[])).catch(()=>setSlots([]));setSlot(null)},[date]);
 async function action(body){setBusy(true);setMsg('');const r=await fetch(`/api/customer/bookings/${booking.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok)return setMsg(j.error||'Could not send request.');if(body.action==='change_request'){setMsg('Change request sent ✓');setTimeout(()=>location.reload(),800)}else{setMsg('Cancellation request sent ✓');setTimeout(()=>location.reload(),800)}}
 const pending=booking.change_request_status==='pending';
 return <div className="manageBooking">
  <section className="managePanel">
   <p className="eyebrow">Need a different time?</p><h2>Request a session change.</h2>
   <p className="muted">You can request another available slot up to {cutoffHours} hours before your session. Your booking does not move until the studio confirms it.</p>
   {pending?<div className="portalNotice"><b>Change request pending.</b><span>You requested {booking.change_requested_date} at {String(booking.change_requested_start||'').slice(0,5)}. We’ll email you once it’s approved or declined.</span></div>:<>
    <div className="dateGrid">{quick.map(d=><button type="button" key={iso(d)} className={`dateCard ${date===iso(d)?'selected':''}`} onClick={()=>setDate(iso(d))}><span>{d.toLocaleDateString('en-GB',{weekday:'short'})}</span><b>{d.getDate()}</b><small>{d.toLocaleDateString('en-GB',{month:'short'})}</small></button>)}</div>
    <div className="slotGrid manageSlots">{slots.map(s=><button type="button" className={`slot ${slot?.start===s.start?'selected':''}`} key={s.start} onClick={()=>setSlot(s)}>{s.start}</button>)}</div>
    <textarea value={note} onChange={e=>setNote(e.target.value)} rows="3" placeholder="Optional note — why do you need to move it?"/>
    <button className="button primary" disabled={!slot||busy} onClick={()=>action({action:'change_request',date,start:slot.start,note})}>Request this slot →</button>
   </>}
  </section>
  <section className="managePanel cancelPanel"><p className="eyebrow">Can’t make it?</p><h2>Request cancellation.</h2><p className="muted">This sends the studio a cancellation request. It does not automatically issue a card refund.</p>{booking.cancellation_requested_at?<div className="portalNotice"><b>Cancellation requested.</b><span>The studio will contact you about the next step.</span></div>:<><textarea value={note} onChange={e=>setNote(e.target.value)} rows="3" placeholder="Optional note for the studio"/><button className="button outline" disabled={busy} onClick={()=>action({action:'cancel_request',note})}>Request cancellation</button></>}{msg&&<p className="manageMessage">{msg}</p>}</section>
 </div>
}
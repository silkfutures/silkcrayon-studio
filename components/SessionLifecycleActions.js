"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function SessionLifecycleActions({booking,role}){
 const router=useRouter(),owner=role==='owner';
 const [mode,setMode]=useState(null),[reason,setReason]=useState('customer_cancelled'),[note,setNote]=useState(''),[refundReason,setRefundReason]=useState('customer_cancelled'),[refundNote,setRefundNote]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const active=['pending','confirmed'].includes(booking.status);
 const refundable=owner&&['paid','part_refunded'].includes(booking.payment_status)&&booking.stripe_payment_intent_id;
 const deletable=owner&&Number(booking.amount_pence||0)<=100&&!['paid','part_refunded'].includes(booking.payment_status);
 const canNoShow=active&&booking.booking_date<=new Date().toISOString().slice(0,10);

 async function lifecycle(body){
  setBusy(true);setMsg('');
  const r=await fetch(`/api/admin/bookings/${booking.id}/lifecycle`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not update session.');
  setMsg('Saved ✓');setMode(null);router.refresh();
 }
 async function refund(){
  setBusy(true);setMsg('');
  const r=await fetch(`/api/admin/bookings/${booking.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({refund:true,refundReason,refundNote})});
  const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok)return setMsg(j.error||'Refund failed.');setMsg('Refund issued ✓');setMode(null);router.refresh();
 }
 async function del(){
  const why=prompt('Reason for deleting this TEST booking?','test_data');
  if(!why)return;
  if(!confirm('Permanently delete this test booking? The deletion itself will remain in the audit log.'))return;
  setBusy(true);setMsg('');
  const r=await fetch(`/api/admin/bookings/${booking.id}`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({reason:why})});
  const j=await r.json().catch(()=>({}));setBusy(false);if(!r.ok)return setMsg(j.error||'Could not delete booking.');router.push(role==='owner'?'/admin':'/admin/engineer');router.refresh();
 }

 return <div className="sessionManage">
  <div className="sessionManageHead"><div><p className="eyebrow">Session status</p><h2>Manage session.</h2><p>This is where a booking becomes completed, cancelled or a no-show. Real bookings stay in the history.</p></div><span className={`sessionState ${booking.status}`}>{String(booking.status).replaceAll('_',' ')}</span></div>
  {active&&<div className="sessionManageButtons">
    {canNoShow&&<button className="engSecondaryAction" onClick={()=>setMode(mode==='noshow'?null:'noshow')}>Mark no-show</button>}
    {owner&&<button className="engSecondaryAction" onClick={()=>setMode(mode==='cancel'?null:'cancel')}>Cancel session</button>}
    {refundable&&<button className="engSecondaryAction warningAction" disabled={busy} onClick={()=>setMode(mode==='refund'?null:'refund')}>Refund & cancel</button>}
    {deletable&&<button className="engSecondaryAction dangerAction" disabled={busy} onClick={del}>Delete test</button>}
  </div>}
  {mode==='refund'&&<div className="sessionManageForm refundForm"><h3>Refund & cancel</h3><p>Choose why money is being returned. This reason is saved permanently in the activity log.</p><label>Refund reason<select value={refundReason} onChange={e=>setRefundReason(e.target.value)}><option value="customer_cancelled">Customer cancelled</option><option value="studio_cancelled">Studio cancelled</option><option value="duplicate">Duplicate payment / booking</option><option value="booking_error">Booking error</option><option value="goodwill">Goodwill</option><option value="service_issue">Service issue</option><option value="other">Other</option></select></label><label>Internal note<textarea rows="3" value={refundNote} onChange={e=>setRefundNote(e.target.value)} placeholder="Optional context for the audit trail"/></label><div className="refundSummary"><span>Refund</span><b>£{((Number(booking.amount_pence||0)-Number(booking.refunded_amount_pence||0))/100).toFixed(2)}</b></div><button className="miniButton solid warningAction" disabled={busy} onClick={refund}>{busy?'Refunding…':'Issue refund & cancel'}</button></div>}
  {mode==='noshow'&&<div className="sessionManageForm"><h3>Mark as no-show?</h3><p>The customer will automatically receive a friendly “we missed you” email with a rebook link. Payment or credits are not automatically returned.</p><textarea rows="3" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional internal note"/><button className="miniButton solid" disabled={busy} onClick={()=>lifecycle({action:'no_show',note})}>Confirm no-show</button></div>}
  {mode==='cancel'&&<div className="sessionManageForm"><h3>Cancel this session</h3><label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}><option value="customer_cancelled">Customer cancelled</option><option value="studio_cancelled">Studio cancelled</option><option value="duplicate">Duplicate booking</option><option value="booking_error">Booking error</option><option value="other">Other</option></select></label><label>Note<textarea rows="3" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional context"/></label>{['paid','part_refunded'].includes(booking.payment_status)&&<div className="portalNotice"><b>This does not refund the payment.</b><span>Use “Refund & cancel” instead if money should be returned.</span></div>}<button className="miniButton solid" disabled={busy} onClick={()=>lifecycle({action:'cancel',reason,note})}>Confirm cancellation</button></div>}
  {!active&&<div className="closedSessionNote"><b>This session is closed.</b><span>It remains in the audit trail and artist history.</span></div>}
  {msg&&<p className="manageMessage">{msg}</p>}
 </div>;
}

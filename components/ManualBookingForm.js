"use client";
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import ArtistSearchSelect from './ArtistSearchSelect';

function addMinutes(time,mins){
 const [h,m]=String(time||'').split(':').map(Number);
 if(!Number.isFinite(h)||!Number.isFinite(m))return '';
 const total=h*60+m+mins; return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
export default function ManualBookingForm({customers=[],engineers=[]}){
 customers=Array.isArray(customers)?customers:[];
 engineers=Array.isArray(engineers)?engineers:[];
 const router=useRouter();
 const [customerId,setCustomerId]=useState('');
 const [date,setDate]=useState('');
 const [start,setStart]=useState('');
 const [hours,setHours]=useState(1);
 const [amount,setAmount]=useState('60');
 const [engineerUserId,setEngineerUserId]=useState('');
 const [paymentMode,setPaymentMode]=useState('pay_by_bank');
 const [notes,setNotes]=useState('');
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);
 const customer=useMemo(()=>customers.find(c=>c.id===customerId),[customers,customerId]);
 const end=addMinutes(start,Math.round(Number(hours)*60));
 function setH(v){const h=Math.max(.5,Math.min(8,Number(v)||1));setHours(h);setAmount(String(Math.round(h*60*100)/100))}
 async function submit(e){
  e.preventDefault();
  if(!customerId)return setMsg('Choose an artist.');
  setBusy(true);setMsg('Creating booking…');
  const r=await fetch('/api/admin/bookings/manual',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   customerId,date,start,end,hours:Number(hours),amount:Number(amount),engineerUserId:engineerUserId||null,paymentMode,notes
  })});
  const j=await r.json().catch(()=>({}));
  setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not create booking.');
  setMsg(j.paymentUrl?'Booked + payment link sent ✓':'Booked + confirmation sent ✓');
  setTimeout(()=>router.push(`/admin/customers/${customerId}`),900);
 }
 return <form className="manualBookingFlow" onSubmit={submit}>
  <section className="commercialStep"><div className="stepBadge">01</div><div><p className="eyebrow">Artist</p><h2>Who is coming in?</h2><ArtistSearchSelect customers={customers} value={customerId} onChange={setCustomerId}/>{customer&&<p className="selectionNote"><b>{customer.artist_name||customer.full_name}</b> · {customer.email}{customer.phone?` · ${customer.phone}`:''}</p>}</div></section>
  <section className="commercialStep"><div className="stepBadge">02</div><div><p className="eyebrow">Session</p><h2>Add it to the calendar.</h2><div className="formGrid">
   <label className="field"><span>Date</span><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="field"><span>Start</span><input type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label className="field"><span>Hours</span><input type="number" min=".5" max="8" step=".5" value={hours} onChange={e=>setH(e.target.value)}/></label>
   <label className="field"><span>End</span><input value={end} readOnly/></label>
   <label className="field"><span>Session value (£)</span><input type="number" min=".30" step=".01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
   <label className="field"><span>Engineer</span><select value={engineerUserId} onChange={e=>setEngineerUserId(e.target.value)}><option value="">Assign later</option>{engineers.map(x=><option key={x.user_id} value={x.user_id}>{x.engineer_name||x.full_name}</option>)}</select></label>
   <label className="field full"><span>Session note</span><textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What are they making / anything the engineer should know?"/></label>
  </div></div></section>
  <section className="commercialStep"><div className="stepBadge">03</div><div><p className="eyebrow">Payment</p><h2>How should they pay?</h2><div className="paymentMethodCards">
   <button type="button" className={paymentMode==='pay_by_bank'?'active':''} onClick={()=>setPaymentMode('pay_by_bank')}><b>Send Pay by Bank link</b><span>Best automated bank option · customer pays from their banking app.</span><small>Stripe fee applies.</small></button>
   <button type="button" className={paymentMode==='card_or_bank'?'active':''} onClick={()=>setPaymentMode('card_or_bank')}><b>Send card + bank link</b><span>Let them choose card, Apple Pay/eligible wallet or Pay by Bank.</span><small>Stripe fee depends on method.</small></button>
   <button type="button" className={paymentMode==='manual_paid'?'active':''} onClick={()=>setPaymentMode('manual_paid')}><b>Already paid by direct bank transfer</b><span>Marks the booking paid manually.</span><small>No Stripe processing fee.</small></button>
   <button type="button" className={paymentMode==='unpaid'?'active':''} onClick={()=>setPaymentMode('unpaid')}><b>Book now · payment later</b><span>Reserve the session and send confirmation only.</span><small>You can take payment later from the artist profile.</small></button>
  </div><label className="check policyCheck"><input type="checkbox" required/><span><b>Customer booking confirmed</b><br/>I have agreed the date/time and Silkcrayon booking policies with the customer.</span></label></div></section>
  <section className="checkoutDock"><div><small>SESSION</small><b>{date||'Choose date'} {start&&`· ${start}–${end}`}</b><span>{hours}h · £{Number(amount||0).toFixed(2)}</span></div><button className="engPrimaryAction buttonLike" disabled={busy}>{busy?'Booking…':'Create + notify artist'} <span>→</span></button>{msg&&<p>{msg}</p>}</section>
 </form>
}

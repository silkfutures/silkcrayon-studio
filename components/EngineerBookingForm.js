"use client";
import {useState} from 'react';
import Link from 'next/link';
function shift(start,hours){
 const [h,m]=start.split(':').map(Number);const n=h*60+m+hours*60;
 return `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}${n>=1440?' (next day)':''}`;
}
export default function EngineerBookingForm(){
 const [fullName,setFullName]=useState(''),[artistName,setArtistName]=useState('');
 const [email,setEmail]=useState(''),[phone,setPhone]=useState('');
 const [date,setDate]=useState(''),[start,setStart]=useState('18:00');
 const [hours,setHours]=useState(2),[notes,setNotes]=useState('');
 const [accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [result,setResult]=useState(null);
 async function submit(e){
  e.preventDefault();if(busy||result)return;setBusy(true);setMessage('');setResult(null);
  try{
   const r=await fetch('/api/engineer/bookings',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({fullName,artistName,email,phone,date,start,hours,notes,customerTermsConfirmed:accepted})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||'Booking could not be created.');
   setResult(d);
  }catch(err){setMessage(err.message);}finally{setBusy(false);}
 }
 return <form className="engineerBookingForm" onSubmit={submit}>
  <p className="eyebrow">Engineer-arranged recording</p>
  <h2>Book a customer.</h2>
  <p data-sensitive="financial" className="muted">Choose a time for your artist and create their payment link. Recording is £50/hour, and payment confirms the session.</p>
  <p><Link href="/admin/calendar">Check studio availability →</Link></p>
  <div className="profileGrid">
   <label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={150}/></label>
   <label>Artist name<input required value={artistName} onChange={e=>setArtistName(e.target.value)} maxLength={150}/></label>
   <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Phone (optional)<input value={phone} onChange={e=>setPhone(e.target.value)}/></label>
   <label>Session date<input type="date" required min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label>Start time<select value={start} onChange={e=>setStart(e.target.value)}>{Array.from({length:48},(_,i)=>{const total=i*30;const v=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;return <option key={v} value={v}>{v}</option>})}</select></label>
   <label>Duration<select value={hours} onChange={e=>setHours(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(duration=><option key={duration} value={duration}>{duration} {duration===1?'hour':'hours'}</option>)}</select></label>
  </div>
  <label>Session notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} placeholder="What does the artist need to record?"/></label>
  <div className="profileMetrics"><div><small>Customer price</small><b data-sensitive="financial">£{hours*50}</b></div><div><small>Session ends</small><b>{shift(start,hours)}</b></div></div>
  <label className="engineerTerms"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/> I have confirmed the artist accepts Silkcrayon's recording terms, cancellation policy and No Harmful Music Policy.</label>
  <p className="muted">Please share the terms with your artist before confirming. They can pay securely using their payment link.</p>
  {message&&<p role="alert">{message}</p>}
  {result?<div className="adminSection"><h3>Payment link created</h3><p data-sensitive="financial">Customer: £{(result.amountPence/100).toFixed(2)}</p><p className="muted">The booking remains pending until Stripe confirms payment. Copy the link and send it to the artist.</p><p><a href={result.checkoutUrl} target="_blank" rel="noopener noreferrer">Open payment page →</a></p><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(result.checkoutUrl);setMessage("Payment link copied.")}catch{setMessage("Could not copy. Open the payment page and copy its address.")}}}>Copy payment link</button><p><Link href="/admin/engineer">Back to engineer dashboard →</Link></p></div>:<button className="engPrimaryAction" disabled={busy||!accepted} type="submit">{busy?'Creating payment link…':'Create booking & payment link →'}</button>}
 </form>;
}

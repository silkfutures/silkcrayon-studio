"use client";
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import ArtistSearchSelect from './ArtistSearchSelect';
import {formatUkDate} from '../lib/dates';

function addMinutes(time,mins){
 const [h,m]=String(time||'').split(':').map(Number);
 if(!Number.isFinite(h)||!Number.isFinite(m))return '';
 const total=h*60+m+mins; return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
const DRAFT_KEY='silkcrayon:manual-booking-draft:v1';

function readDraft(){
 try{
  const raw=localStorage.getItem(DRAFT_KEY);
  return raw?JSON.parse(raw):null;
 }catch{return null}
}
function clearDraft(){try{localStorage.removeItem(DRAFT_KEY)}catch{}}

export default function ManualBookingForm({customers=[],engineers=[],hourlyPrice=50}){
 customers=Array.isArray(customers)?customers:[];
 engineers=Array.isArray(engineers)?engineers:[];
 const router=useRouter();
 const [customerId,setCustomerId]=useState('');
 const [serviceSlug,setServiceSlug]=useState('vocal-recording');
 const [date,setDate]=useState('');
 const [start,setStart]=useState('');
 const [hours,setHours]=useState('1');
 const [amount,setAmount]=useState(String(hourlyPrice));
 const [engineerUserId,setEngineerUserId]=useState('');
 const [paymentMode,setPaymentMode]=useState('pay_by_bank');
 const [notes,setNotes]=useState('');
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);
 const [policyConfirmed,setPolicyConfirmed]=useState(false);
 const [dryHireConfirmed,setDryHireConfirmed]=useState(false);
 const [draftReady,setDraftReady]=useState(false);
 const customer=useMemo(()=>customers.find(c=>c.id===customerId),[customers,customerId]);

 useEffect(()=>{
  const d=readDraft();
  if(d){
   if(d.customerId)setCustomerId(String(d.customerId));
   if(d.serviceSlug)setServiceSlug(String(d.serviceSlug));
   if(d.date)setDate(String(d.date));
   if(d.start)setStart(String(d.start));
   if(d.hours!==undefined&&d.hours!==null)setHours(String(d.hours));
   if(d.amount!==undefined&&d.amount!==null)setAmount(String(d.amount));
   if(d.engineerUserId)setEngineerUserId(String(d.engineerUserId));
   if(d.paymentMode)setPaymentMode(String(d.paymentMode));
   if(d.notes)setNotes(String(d.notes));
   if(d.policyConfirmed)setPolicyConfirmed(true);
   if(d.dryHireConfirmed)setDryHireConfirmed(true);
  }
  setDraftReady(true);
 },[]);

 useEffect(()=>{
  if(!draftReady)return;
  try{
   localStorage.setItem(DRAFT_KEY,JSON.stringify({
    customerId,serviceSlug,date,start,hours,amount,engineerUserId,paymentMode,notes,policyConfirmed,dryHireConfirmed,
    savedAt:new Date().toISOString()
   }));
  }catch{}
 },[draftReady,customerId,serviceSlug,date,start,hours,amount,engineerUserId,paymentMode,notes,policyConfirmed,dryHireConfirmed]);
 const rate=serviceSlug==='dry-hire'?40:Number(hourlyPrice||50);
 const numericHours=Number(hours);
 const validHours=Number.isFinite(numericHours)&&numericHours>=(serviceSlug==='dry-hire'?2:.5)&&numericHours<=8;
 const end=validHours?addMinutes(start,Math.round(numericHours*60)):'';
 function changeHours(v){
  setHours(v);
  const h=Number(v);
  if(Number.isFinite(h)&&h>=(serviceSlug==='dry-hire'?2:.5)&&h<=8)setAmount(String(Math.round(h*rate*100)/100));
 }
 function normaliseHours(){
  let h=Number(hours);
  if(!Number.isFinite(h))h=1;
  h=Math.max(serviceSlug==='dry-hire'?2:.5,Math.min(8,Math.round(h*2)/2));
  setHours(String(h));
  setAmount(String(Math.round(h*rate*100)/100));
 }
 async function submit(e){
  e.preventDefault();
  if(!customerId)return setMsg('Choose an artist.');
  if(!policyConfirmed)return setMsg('Confirm the customer booking policies first.');
  if(serviceSlug==='dry-hire'&&!dryHireConfirmed)return setMsg('Confirm the Dry Hire lead-hirer terms and 18+ requirement.');
  const h=Number(hours);
  if(!Number.isFinite(h)||h<(serviceSlug==='dry-hire'?2:.5)||h>8)return setMsg(serviceSlug==='dry-hire'?'Dry Hire has a 2-hour minimum.':'Choose between 0.5 and 8 hours.');
  if(!end)return setMsg('Choose a valid session duration.');
  setBusy(true);setMsg('Creating booking…');
  const r=await fetch('/api/admin/bookings/manual',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   customerId,serviceSlug,date,start,end,hours:Number(hours),amount:Number(amount),engineerUserId:serviceSlug==='dry-hire'?null:(engineerUserId||null),paymentMode,notes,dryHireConfirmed
  })});
  const j=await r.json().catch(()=>({}));
  setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not create booking.');
  clearDraft();
  const success=j.idRequestWarning?`Booked ✓ ${j.idRequestWarning}`:serviceSlug==='dry-hire'?(j.idRequestSent?(j.paymentUrl?'Booked + payment link + ID request sent ✓':'Booked + ID request sent ✓'):(j.paymentUrl?'Booked + payment link sent ✓ · ID already verified':'Booked ✓ · ID already verified')):(j.paymentUrl?'Booked + payment link sent ✓':'Booked + confirmation sent ✓');
  setMsg(success);
  setTimeout(()=>router.push(serviceSlug==='dry-hire'?`/admin/engineer/session/${j.bookingId}`:`/admin/customers/${customerId}`),j.idRequestWarning?2200:1100);
 }
 return <form className="manualBookingFlow" onSubmit={submit}>
  <section className="commercialStep"><div className="stepBadge">01</div><div><p className="eyebrow">Artist</p><h2>Who is coming in?</h2><ArtistSearchSelect customers={customers} value={customerId} onChange={setCustomerId}/>{customer&&<p className="selectionNote"><b>{customer.artist_name||customer.full_name}</b> · {customer.email}{customer.phone?` · ${customer.phone}`:''}</p>}</div></section>
  <section className="commercialStep"><div className="stepBadge">02</div><div><p className="eyebrow">Session</p><h2>Add it to the calendar.</h2><div className="manualServiceToggle"><button type="button" className={serviceSlug==='vocal-recording'?'active':''} onClick={()=>{setServiceSlug('vocal-recording');setHours('1');setAmount(String(hourlyPrice));setDryHireConfirmed(false)}}>Recording · £{hourlyPrice}/hr</button><button type="button" className={serviceSlug==='dry-hire'?'active':''} onClick={()=>{setServiceSlug('dry-hire');setHours('2');setAmount('80');setEngineerUserId('')}}>Dry Hire · £40/hr</button></div><div className="formGrid">
   <label className="field"><span>Date</span><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="field"><span>Start</span><input type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label className="field"><span>Hours</span><input type="number" inputMode="decimal" min=".5" max="8" step=".5" value={hours} onChange={e=>changeHours(e.target.value)} onBlur={normaliseHours}/><small>{serviceSlug==='dry-hire'?'2–8 hours · dry hire minimum':'0.5–8 hours'}</small></label>
   <label className="field"><span>End</span><input value={end} readOnly/></label>
   <label className="field"><span>Session value (£)</span><input type="number" min=".30" step=".01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
   {serviceSlug!=='dry-hire'&&<label className="field"><span>Engineer</span><select value={engineerUserId} onChange={e=>setEngineerUserId(e.target.value)}><option value="">Assign later</option>{engineers.map(x=><option key={x.user_id} value={x.user_id}>{x.engineer_name||x.full_name}</option>)}</select></label>}
   <label className="field full"><span>Session note</span><textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What are they making / anything the engineer should know?"/></label>
  </div></div></section>
  <section className="commercialStep"><div className="stepBadge">03</div><div><p className="eyebrow">Payment</p><h2>How should they pay?</h2><div className="paymentMethodCards">
   <button type="button" className={paymentMode==='pay_by_bank'?'active':''} onClick={()=>setPaymentMode('pay_by_bank')}><b>Send Pay by Bank link</b><span>Best automated bank option · customer pays from their banking app.</span><small>Stripe fee applies.</small></button>
   <button type="button" className={paymentMode==='card_or_bank'?'active':''} onClick={()=>setPaymentMode('card_or_bank')}><b>Send card + bank link</b><span>Let them choose card, Apple Pay/eligible wallet or Pay by Bank.</span><small>Stripe fee depends on method.</small></button>
   <button type="button" className={paymentMode==='manual_paid'?'active':''} onClick={()=>setPaymentMode('manual_paid')}><b>Already paid by direct bank transfer</b><span>Marks the booking paid manually.</span><small>No Stripe processing fee.</small></button>
   <button type="button" className={paymentMode==='unpaid'?'active':''} onClick={()=>setPaymentMode('unpaid')}><b>Book now · payment later</b><span>Reserve the session and send confirmation only.</span><small>You can take payment later from the artist profile.</small></button>
  </div>{serviceSlug==='dry-hire'&&<label className="check policyCheck"><input type="checkbox" required checked={dryHireConfirmed} onChange={e=>setDryHireConfirmed(e.target.checked)}/><span><b>Dry Hire lead hirer confirmed</b><br/>The customer is 18+, accepts the Dry Hire Terms, and understands photo-ID verification is required before access.</span></label>}<label className="check policyCheck"><input type="checkbox" required checked={policyConfirmed} onChange={e=>setPolicyConfirmed(e.target.checked)}/><span><b>Customer booking confirmed</b><br/>I have agreed the date/time and Silkcrayon booking policies with the customer.</span></label></div></section>
  <section className="checkoutDock"><div><small>SESSION</small><b>{date?formatUkDate(date):'Choose date'} {start&&`· ${start}–${end}`}</b><span>{validHours?`${numericHours}h`:'Choose hours'} · £{Number(amount||0).toFixed(2)}</span></div><button className="engPrimaryAction buttonLike" disabled={busy}>{busy?'Booking…':'Create + notify artist'} <span>→</span></button><button type="button" className="draftClearButton" onClick={()=>{clearDraft();setCustomerId('');setServiceSlug('vocal-recording');setDate('');setStart('');setHours('1');setAmount(String(hourlyPrice));setEngineerUserId('');setPaymentMode('pay_by_bank');setNotes('');setPolicyConfirmed(false);setDryHireConfirmed(false);setMsg('Draft cleared.')}}>Clear draft</button>{msg&&<p>{msg}</p>}</section>
 </form>
}

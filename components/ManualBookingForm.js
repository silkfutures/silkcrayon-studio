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
const DRAFT_KEY='silkcrayon:manual-booking-draft:v2';

function readDraft(){
 try{
  const raw=localStorage.getItem(DRAFT_KEY);
  return raw?JSON.parse(raw):null;
 }catch{return null}
}
function clearDraft(){try{localStorage.removeItem(DRAFT_KEY)}catch{}}

export default function ManualBookingForm({customers=[],engineers=[],hourlyPrice=50,initialProject=null}){
 customers=Array.isArray(customers)?customers:[];
 engineers=Array.isArray(engineers)?engineers:[];
 const router=useRouter();
 const projectMode=Boolean(initialProject?.id);
 const [customerId,setCustomerId]=useState(initialProject?.customer_id||'');
 const [serviceSlug,setServiceSlug]=useState(projectMode?'podcast-recording':'vocal-recording');
 const [date,setDate]=useState('');
 const [start,setStart]=useState('');
 const [hours,setHours]=useState('1');
 const [amount,setAmount]=useState(projectMode?'0':String(hourlyPrice));
 const [engineerUserId,setEngineerUserId]=useState('');
 const [paymentMode,setPaymentMode]=useState(projectMode?'project_included':'pay_by_bank');
 const [partialPaidAmount,setPartialPaidAmount]=useState('');
 const [partialPaidMethod,setPartialPaidMethod]=useState('bank_transfer');
 const [balanceReminderDate,setBalanceReminderDate]=useState('');
 const [balancePaymentUrl,setBalancePaymentUrl]=useState('');
 const [notes,setNotes]=useState('');
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);
 const [policyConfirmed,setPolicyConfirmed]=useState(false);
 const [dryHireConfirmed,setDryHireConfirmed]=useState(false);
 const [dryHireIdRequired,setDryHireIdRequired]=useState(true);
 const [draftReady,setDraftReady]=useState(false);
 const customer=useMemo(()=>customers.find(c=>c.id===customerId),[customers,customerId]);

 useEffect(()=>{
  const d=projectMode?null:readDraft();
  if(d){
   if(d.customerId)setCustomerId(String(d.customerId));
   if(d.serviceSlug)setServiceSlug(String(d.serviceSlug));
   if(d.date)setDate(String(d.date));
   if(d.start)setStart(String(d.start));
   if(d.hours!==undefined&&d.hours!==null)setHours(String(d.hours));
   if(d.amount!==undefined&&d.amount!==null)setAmount(String(d.amount));
   if(d.engineerUserId)setEngineerUserId(String(d.engineerUserId));
   if(d.paymentMode)setPaymentMode(String(d.paymentMode));
   if(d.partialPaidAmount!==undefined&&d.partialPaidAmount!==null)setPartialPaidAmount(String(d.partialPaidAmount));
   if(d.partialPaidMethod)setPartialPaidMethod(String(d.partialPaidMethod));
   if(d.balanceReminderDate)setBalanceReminderDate(String(d.balanceReminderDate));
   if(d.balancePaymentUrl)setBalancePaymentUrl(String(d.balancePaymentUrl));
   if(d.notes)setNotes(String(d.notes));
   if(d.policyConfirmed)setPolicyConfirmed(true);
   if(d.dryHireConfirmed)setDryHireConfirmed(true);
   if(d.dryHireIdRequired!==undefined)setDryHireIdRequired(Boolean(d.dryHireIdRequired));
  }
  setDraftReady(true);
 },[projectMode]);

 useEffect(()=>{
  if(!draftReady||projectMode)return;
  try{
   localStorage.setItem(DRAFT_KEY,JSON.stringify({
    customerId,serviceSlug,date,start,hours,amount,engineerUserId,paymentMode,partialPaidAmount,partialPaidMethod,balanceReminderDate,balancePaymentUrl,notes,policyConfirmed,dryHireConfirmed,dryHireIdRequired,
    savedAt:new Date().toISOString()
   }));
  }catch{}
 },[draftReady,projectMode,customerId,serviceSlug,date,start,hours,amount,engineerUserId,paymentMode,partialPaidAmount,partialPaidMethod,balanceReminderDate,balancePaymentUrl,notes,policyConfirmed,dryHireConfirmed,dryHireIdRequired]);
 const rate=projectMode?0:(serviceSlug==='dry-hire'?40:Number(hourlyPrice||50));
 const numericHours=Number(hours);
 const numericAmount=Number(amount||0);
 const numericPartial=Number(partialPaidAmount||0);
 const partialRemaining=Math.max(0,numericAmount-numericPartial);
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
  setAmount(projectMode?'0':String(Math.round(h*rate*100)/100));
 }
 function changeRemainingBalance(v){
  const remaining=Number(v);
  if(!Number.isFinite(remaining))return;
  const bounded=Math.max(0,Math.min(numericAmount,remaining));
  const received=Math.max(0,numericAmount-bounded);
  setPartialPaidAmount(String(Math.round(received*100)/100));
 }
 async function submit(e){
  e.preventDefault();
  if(!customerId)return setMsg('Choose an artist.');
  if(!policyConfirmed)return setMsg('Confirm the customer booking policies first.');
  if(serviceSlug==='dry-hire'&&!dryHireConfirmed)return setMsg('Confirm the Dry Hire lead-hirer terms and 18+ requirement.');
  const h=Number(hours);
  if(!Number.isFinite(h)||h<(serviceSlug==='dry-hire'?2:.5)||h>8)return setMsg(serviceSlug==='dry-hire'?'Dry Hire has a 2-hour minimum.':'Choose between 0.5 and 8 hours.');
  if(!end)return setMsg('Choose a valid session duration.');
  if(paymentMode==='partial_paid'){
   if(!Number.isFinite(numericPartial)||numericPartial<0||numericPartial>=numericAmount)return setMsg('Enter an amount from £0 up to less than the full session value. Use Already paid if the full amount has been received.');
   if(!balanceReminderDate)return setMsg('Choose the date to remind the customer about the remaining balance.');
   if(balancePaymentUrl&&!/^https?:\/\//i.test(balancePaymentUrl.trim()))return setMsg('Paste a full Monzo/payment link beginning with https://');
  }
  setBusy(true);setMsg('Creating booking…');
  const r=await fetch('/api/admin/bookings/manual',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   customerId,serviceSlug,date,start,end,hours:Number(hours),amount:projectMode?0:Number(amount),engineerUserId:serviceSlug==='dry-hire'?null:(engineerUserId||null),paymentMode:projectMode?'project_included':paymentMode,
   partialPaidAmount:paymentMode==='partial_paid'?numericPartial:0,partialPaidMethod,balanceReminderDate:paymentMode==='partial_paid'?balanceReminderDate:null,balancePaymentUrl:paymentMode==='partial_paid'?balancePaymentUrl.trim():null,
   notes,dryHireConfirmed,dryHireIdRequired:serviceSlug==='dry-hire'?dryHireIdRequired:true,projectId:initialProject?.id||null
  })});
  const j=await r.json().catch(()=>({}));
  setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not create booking.');
  if(!projectMode)clearDraft();
  const success=j.paymentLinkWarning?j.paymentLinkWarning:j.depositWarning?j.depositWarning:j.idRequestWarning?`Booked ✓ ${j.idRequestWarning}`:paymentMode==='partial_paid'?`Booked · £${numericPartial.toFixed(2)} received · £${partialRemaining.toFixed(2)} reminder scheduled ✓`:serviceSlug==='dry-hire'?(j.dryHireIdRequired===false?(j.paymentUrl?'Booked + payment link sent ✓ · ID check not required':'Booked ✓ · ID check not required'):j.idRequestSent?(j.paymentUrl?'Booked + payment link + ID request sent ✓':'Booked + ID request sent ✓'):(j.paymentUrl?'Booked + payment link sent ✓ · ID already verified':'Booked ✓ · ID already verified')):(j.paymentUrl?'Booked + payment link sent ✓':'Booked + confirmation sent ✓');
  setMsg(success);
  setTimeout(()=>router.push(projectMode?`/admin/projects/${initialProject.id}`:serviceSlug==='dry-hire'?`/admin/engineer/session/${j.bookingId}`:`/admin/customers/${customerId}`),j.paymentLinkWarning||j.depositWarning||j.idRequestWarning?5000:1100);
 }
 return <form className="manualBookingFlow" onSubmit={submit}>
  <section className="commercialStep"><div className="stepBadge">01</div><div><p className="eyebrow">{projectMode?'Project client':'Artist'}</p><h2>{projectMode?'Linked to this project.':'Who is coming in?'}</h2>{projectMode?<div className="projectBookingLock"><b>{initialProject.title}</b><span>{initialProject.contact_name} · {initialProject.email}</span><small>{Number(initialProject.recording_hours_included||0)-Number(initialProject.recording_hours_used||0)}h recording allowance currently remaining</small></div>:<ArtistSearchSelect customers={customers} value={customerId} onChange={setCustomerId}/>} {customer&&<p className="selectionNote"><b>{customer.artist_name||customer.full_name}</b> · {customer.email}{customer.phone?` · ${customer.phone}`:''}</p>}</div></section>
  <section className="commercialStep"><div className="stepBadge">02</div><div><p className="eyebrow">Session</p><h2>Add it to the calendar.</h2>{projectMode?<div className="projectIncludedBanner"><b>Podcast recording · included in project quote</b><span>This calendar session uses the project's recording-hour allowance. No separate session charge will be created.</span></div>:<div className="manualServiceToggle"><button type="button" className={serviceSlug==='vocal-recording'?'active':''} onClick={()=>{setServiceSlug('vocal-recording');setHours('1');setAmount(String(hourlyPrice));setDryHireConfirmed(false)}}>Recording · £{hourlyPrice}/hr</button><button type="button" className={serviceSlug==='dry-hire'?'active':''} onClick={()=>{setServiceSlug('dry-hire');setHours('2');setAmount('80');setEngineerUserId('');setDryHireIdRequired(true)}}>Dry Hire · £40/hr</button></div>}<div className="formGrid">
   <label className="field"><span>Date</span><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label className="field"><span>Start</span><input type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label className="field"><span>Hours</span><input type="number" inputMode="decimal" min=".5" max="8" step=".5" value={hours} onChange={e=>changeHours(e.target.value)} onBlur={normaliseHours}/><small>{serviceSlug==='dry-hire'?'2–8 hours · dry hire minimum':'0.5–8 hours'}</small></label>
   <label className="field"><span>End</span><input value={end} readOnly/></label>
   <label className="field"><span>{projectMode?'Project billing':'Session value (£)'}</span>{projectMode?<input value="Included in project quote" readOnly/>:<input type="number" min=".30" step=".01" value={amount} onChange={e=>setAmount(e.target.value)}/>}</label>
   {serviceSlug!=='dry-hire'&&<label className="field"><span>Engineer</span><select value={engineerUserId} onChange={e=>setEngineerUserId(e.target.value)}><option value="">Assign later</option>{engineers.map(x=><option key={x.user_id} value={x.user_id}>{x.engineer_name||x.full_name}</option>)}</select></label>}
   <label className="field full"><span>Session note</span><textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What are they making / anything the engineer should know?"/></label>
  </div></div></section>
  <section className="commercialStep"><div className="stepBadge">03</div><div><p className="eyebrow">{projectMode?'Project billing':'Payment'}</p><h2>{projectMode?'Already covered by the project quote.':'How should they pay?'}</h2>{projectMode?<div className="projectIncludedBanner"><b>No separate payment for this session</b><span>Recording is billed at project level. Post-production remains a separate project line item.</span></div>:<><div className="paymentMethodCards">
   <button type="button" className={paymentMode==='pay_by_bank'?'active':''} onClick={()=>setPaymentMode('pay_by_bank')}><b>Send Pay by Bank link</b><span>Best automated bank option · customer pays from their banking app.</span><small>Stripe fee applies.</small></button>
   <button type="button" className={paymentMode==='card_or_bank'?'active':''} onClick={()=>setPaymentMode('card_or_bank')}><b>Send card + bank link</b><span>Let them choose card, Apple Pay/eligible wallet or Pay by Bank.</span><small>Stripe fee depends on method.</small></button>
   <button type="button" className={paymentMode==='partial_paid'?'active':''} onClick={()=>setPaymentMode('partial_paid')}><b>Deposit / pay later</b><span>Use this for a deposit, part payment, or £0 paid when the customer has promised to pay later.</span><small>Paste a Monzo Business payment link for the balance if you have one.</small></button>
   <button type="button" className={paymentMode==='manual_paid'?'active':''} onClick={()=>setPaymentMode('manual_paid')}><b>Already paid by direct bank transfer</b><span>Marks the booking paid manually.</span><small>No Stripe processing fee.</small></button>
   <button type="button" className={paymentMode==='unpaid'?'active':''} onClick={()=>setPaymentMode('unpaid')}><b>Book now · payment later</b><span>Reserve the session and send confirmation only.</span><small>You can take payment later from the artist profile.</small></button>
  </div>{paymentMode==='partial_paid'&&<div className="projectIncludedBanner" style={{marginTop:18}}><b>Balance due later</b><span>Enter anything from £0 up to a part payment. Studio OS will show the remaining balance and send the customer a reminder on the date you choose.</span><div className="formGrid" style={{marginTop:16}}>
   <label className="field"><span>Already received (£)</span><input type="number" min="0" step=".01" value={partialPaidAmount} onChange={e=>setPartialPaidAmount(e.target.value)} onFocus={e=>e.currentTarget.select()} placeholder="0"/><small>£0 is allowed when nothing has arrived yet. Edit this or the remaining balance — the other amount updates automatically.</small></label>
   <label className="field"><span>{numericPartial>0?'Received via':'Balance payment method'}</span><select value={partialPaidMethod} onChange={e=>setPartialPaidMethod(e.target.value)}><option value="bank_transfer">Monzo / bank transfer</option><option value="cash">Cash</option><option value="external_card">Card elsewhere</option><option value="other">Other</option></select></label>
   <label className="field"><span>Balance reminder date</span><input type="date" value={balanceReminderDate} onChange={e=>setBalanceReminderDate(e.target.value)}/></label>
   <label className="field"><span>Remaining balance (£)</span><input type="number" min="0" max={numericAmount} step=".01" value={partialRemaining.toFixed(2)} onChange={e=>changeRemainingBalance(e.target.value)} onFocus={e=>e.currentTarget.select()}/><small>Type the amount still due. Studio OS recalculates what has already been paid.</small></label>
   <label className="field full"><span>Monzo balance payment link · optional</span><input type="url" inputMode="url" value={balancePaymentUrl} onChange={e=>setBalancePaymentUrl(e.target.value)} placeholder="https://..."/><small>Recommended: create a Monzo Business payment link for exactly £{partialRemaining.toFixed(2)} and paste it here. Studio OS will send this link automatically on the reminder date.</small></label>
  </div></div>}</>}{serviceSlug==='dry-hire'&&<div className="projectIncludedBanner" style={{marginTop:18}}><b>Dry Hire ID check</b><span>{customer?.dry_hire_id_verified_at?'This artist is already ID verified, so no new upload will be requested.':'Choose whether this booking needs the usual lead-hirer ID check.'}</span>{!customer?.dry_hire_id_verified_at&&<label className="check policyCheck" style={{marginTop:12}}><input type="checkbox" checked={dryHireIdRequired} onChange={e=>setDryHireIdRequired(e.target.checked)}/><span><b>Require ID check for this booking</b><br/>Turn this off for a known/approved artist when you do not need an ID upload. No ID request or reminder will be sent for this booking.</span></label>}</div>}{serviceSlug==='dry-hire'&&<label className="check policyCheck"><input type="checkbox" required checked={dryHireConfirmed} onChange={e=>setDryHireConfirmed(e.target.checked)}/><span><b>Dry Hire lead hirer confirmed</b><br/>The customer is 18+, accepts the Dry Hire Terms{dryHireIdRequired&&!customer?.dry_hire_id_verified_at?', and understands photo-ID verification is required before access.':'.'}</span></label>}<label className="check policyCheck"><input type="checkbox" required checked={policyConfirmed} onChange={e=>setPolicyConfirmed(e.target.checked)}/><span><b>Customer booking confirmed</b><br/>I have agreed the date/time and Silkcrayon booking policies with the customer.</span></label></div></section>
  <section className="checkoutDock"><div><small>SESSION</small><b>{date?formatUkDate(date):'Choose date'} {start&&`· ${start}–${end}`}</b><span>{validHours?`${numericHours}h`:'Choose hours'} · {projectMode?'Included in project quote':paymentMode==='partial_paid'?`£${numericPartial.toFixed(2)} paid · £${partialRemaining.toFixed(2)} due`:`£${Number(amount||0).toFixed(2)}`}</span></div><button className="engPrimaryAction buttonLike" disabled={busy}>{busy?'Booking…':'Create + notify artist'} <span>→</span></button>{!projectMode&&<button type="button" className="draftClearButton" onClick={()=>{clearDraft();setCustomerId('');setServiceSlug('vocal-recording');setDate('');setStart('');setHours('1');setAmount(String(hourlyPrice));setEngineerUserId('');setPaymentMode('pay_by_bank');setPartialPaidAmount('');setPartialPaidMethod('bank_transfer');setBalanceReminderDate('');setBalancePaymentUrl('');setNotes('');setPolicyConfirmed(false);setDryHireConfirmed(false);setDryHireIdRequired(true);setMsg('Draft cleared.')}}>Clear draft</button>}{msg&&<p>{msg}</p>}</section>
 </form>
}

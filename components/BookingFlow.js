"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const services = {
  "vocal-recording": { name: "Vocal Recording", durations: [60,120,180,240,300,360,420], price: (d)=>d===120?"£100":`£${d}` },
  "full-day": { name: "Full Day Studio", durations: [480], price: ()=>"£450" },
  "system-test": { name: "30p Test Booking", durations: [60], price: ()=>"£0.30" },
};
const PACKS={3:170,4:220,5:270,6:320,7:370,8:420,9:470,10:520};

function durationLabel(m) { return m >= 60 ? `${m/60} ${m === 60 ? "hour" : "hours"}` : `${m} mins`; }
function isoLocal(d) {
  const y = d.getFullYear(),m = String(d.getMonth() + 1).padStart(2, "0"),day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function nextBookableDays(count = 18) {
  const out = [],d = new Date();d.setHours(12,0,0,0);d.setDate(d.getDate() + 1);
  while (out.length < count) {if (d.getDay() !== 0) out.push(new Date(d));d.setDate(d.getDate() + 1);}
  return out;
}
function prettyDay(d) {
  return {weekday:d.toLocaleDateString("en-GB",{weekday:"short"}),day:d.getDate(),month:d.toLocaleDateString("en-GB",{month:"short"})};
}

export default function BookingFlow() {
  const params=useSearchParams(),showTest=params.get("test")==="1",requestedService=params.get("service");
  const initial=requestedService&&services[requestedService]&&(requestedService!=="system-test"||showTest)?requestedService:"vocal-recording";
  const quickDates=useMemo(()=>nextBookableDays(18),[]);
  const [mode,setMode]=useState("session");
  const [service,setService]=useState(initial),[duration,setDuration]=useState(services[initial].durations[0]);
  const [packHours,setPackHours]=useState(5);
  const [date,setDate]=useState(()=>isoLocal(nextBookableDays(1)[0])),[slots,setSlots]=useState([]),[slot,setSlot]=useState(null);
  const [loadingSlots,setLoadingSlots]=useState(false),[availabilityError,setAvailabilityError]=useState(""),[error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false),[detailsReady,setDetailsReady]=useState(false),[engineers,setEngineers]=useState([]),[promotions,setPromotions]=useState([]);
  const availabilityRequest=useRef(0);

  function chooseService(slug){
    if(slug==="hour-packs"){setMode("pack");setAvailabilityError("");setSlots([]);setSlot(null);return}
    const next=services[slug];if(!next)return;
    setMode("session");setAvailabilityError("");setSlots([]);setSlot(null);setService(slug);setDuration(next.durations[0]);
  }

  useEffect(()=>{fetch("/api/public/engineers").then(r=>r.json()).then(j=>setEngineers(j.engineers||[])).catch(()=>setEngineers([]));fetch("/api/public/promotions").then(r=>r.json()).then(j=>setPromotions(j.promotions||[])).catch(()=>setPromotions([]))},[]);
  useEffect(()=>{
    if(mode!=="session")return;
    const currentService=services[service];
    if(!date||!currentService||!currentService.durations.includes(Number(duration)))return;
    const requestId=++availabilityRequest.current,controller=new AbortController();
    setLoadingSlots(true);setSlot(null);setSlots([]);setAvailabilityError("");setError("");
    const q=new URLSearchParams({date,service,duration:String(duration)});
    fetch(`/api/availability?${q.toString()}`,{signal:controller.signal})
      .then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Could not load availability");return j})
      .then(j=>{if(requestId===availabilityRequest.current)setSlots(Array.isArray(j.slots)?j.slots:[])})
      .catch(e=>{if(e?.name!=="AbortError"&&requestId===availabilityRequest.current){setSlots([]);setAvailabilityError(e.message||"Could not load availability")}})
      .finally(()=>{if(requestId===availabilityRequest.current)setLoadingSlots(false)});
    return()=>controller.abort();
  },[date,duration,service,mode]);

  const minDate=useMemo(()=>isoLocal(new Date()),[]);
  const packPrice=PACKS[packHours],packList=packHours*60,packSaving=packList-packPrice,packRate=packPrice/packHours;
  const promoFor=(slug,d)=>promotions.find(p=>p.serviceSlug===slug&&Number(p.durationMinutes)===Number(d));
  const vocalPromo=promotions.find(p=>p.serviceSlug==="vocal-recording");
  const displayPrice=(slug,d)=>{const pr=promoFor(slug,d);return pr?`£${(pr.amountPence/100).toFixed(pr.amountPence%100?2:0)}`:services[slug].price(d)};

  async function submit(e){
    e.preventDefault();setSubmitting(true);setError("");
    const fd=new FormData(e.currentTarget),body=Object.fromEntries(fd.entries());
    body.marketingConsent=fd.get("marketingConsent")==="on";body.smsMarketingConsent=fd.get("smsMarketingConsent")==="on";
    body.policyAccepted=fd.get("policyAccepted")==="on";body.harmfulMusicPolicy=body.policyAccepted;
    try{
      if(mode==="pack"){
        const res=await fetch("/api/store/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
          kind:"hours",hours:packHours,buyerName:body.fullName,buyerEmail:body.email,recipientName:body.fullName,recipientEmail:body.email
        })});
        const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Could not create hour-pack checkout");
        window.location.href=data.url;return;
      }
      if(!slot)throw new Error("Choose a time first.");
      body.service=service;body.duration=duration;body.date=date;body.start=slot.start;body.end=slot.end;
      body.smsServiceConsent=Boolean(String(body.phone||"").trim());
      body.preferredEngineerName=engineers.find(x=>x.id===body.preferredEngineerUserId)?.name||"";
      const res=await fetch("/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not create booking");window.location.href=data.url;
    }catch(e){setError(e.message);setSubmitting(false)}
  }

  function updateReadiness(e){
    const form=e.currentTarget,fullName=form.elements.fullName?.value?.trim(),email=form.elements.email?.value?.trim(),policy=form.elements.policyAccepted?.checked;
    setDetailsReady(Boolean(fullName&&email&&policy&&form.elements.email?.checkValidity()));
  }
  const checkoutReady=mode==="pack"?detailsReady:Boolean(slot&&detailsReady);

  return <form className="bookingPanel" onSubmit={submit} onInput={updateReadiness} onChange={updateReadiness}>
    <div className="bookingSection"><span className="step">01</span><div><h2>Choose your session</h2><div className="optionGrid">
      {Object.entries(services).filter(([slug])=>slug!=="system-test"||showTest).map(([slug,s])=><button type="button" key={slug} className={`option ${mode==="session"&&service===slug?"active":""}`} onClick={()=>chooseService(slug)}><b>{s.name}{slug==="vocal-recording"&&vocalPromo&&<span className="offerSticker saleBurstMini">{vocalPromo.badgeText||"OFFER"}</span>}</b><small>{slug==="full-day"?"£450":slug==="system-test"?"£0.30":vocalPromo?`£60 / hour · ${vocalPromo.name}`:"£60 / hour"}</small></button>)}
      <button type="button" className={`option ${mode==="pack"?"active":""}`} onClick={()=>chooseService("hour-packs")}><b>Studio Hour Packs</b><small>3–10 hours · save more as you commit</small></button>
      <a className="option optionLink giftOption" href="/gift-studio-time"><b>Gift Studio Time</b><small>Choose 1–8 hours</small><span>→</span></a>
    </div></div></div>

    {mode==="pack"?<>
      <div className="bookingSection"><span className="step">02</span><div className="inlinePackSection"><h2>Choose your hours</h2><p className="dateHint">Buy the time now. Choose your dates later.</p>
        <div className="hourWheel inlineHourWheel"><div className="hourWheelReadout"><div><small>STUDIO CREDIT</small><b>{packHours} HOURS</b><span>£{packRate.toFixed(packRate%1?2:0)}/hour effective rate</span></div><div className="hourWheelPrice"><strong>£{packPrice}</strong><span>Save £{packSaving}</span></div></div>
          <input aria-label="Choose studio hours" type="range" min="3" max="10" step="1" value={packHours} onChange={e=>setPackHours(Number(e.target.value))}/>
          <div className="hourWheelTicks">{Object.keys(PACKS).map(h=><button type="button" key={h} className={packHours===Number(h)?"active":""} onClick={()=>setPackHours(Number(h))}>{h}h</button>)}</div>
        </div>
      </div></div>
    </>:<>
      <div className="bookingSection"><span className="step">02</span><div><h2>Choose duration & date</h2><div className="durationRow">{services[service].durations.map(d=><button type="button" className={`${duration===d?"activePill":"pill"} ${promoFor(service,d)?"offerDuration":""}`} key={d} onClick={()=>setDuration(d)}>{durationLabel(d)} · {displayPrice(service,d)}{promoFor(service,d)&&<em> SAVE £{Math.max(0,Math.round(((promoFor(service,d).listAmountPence||0)-(promoFor(service,d).amountPence||0))/100))}</em>}</button>)}</div>
        <p className="dateHint">Choose a day — no typing required.</p>
        <div className="dateGrid">{quickDates.map(d=>{const v=isoLocal(d),p=prettyDay(d);return <button type="button" key={v} className={`dateCard ${date===v?"selected":""}`} onClick={()=>setDate(v)}><span>{p.weekday}</span><b>{p.day}</b><small>{p.month}</small></button>})}</div>
        <details className="moreDates"><summary>Choose a later date</summary><label className="field"><span>Date</span><input type="date" value={date} min={minDate} onChange={e=>setDate(e.target.value)} required/></label></details>
      </div></div>
      <div className="bookingSection"><span className="step">03</span><div><h2>Pick a time</h2>{loadingSlots?<p className="muted">Checking the diary…</p>:availabilityError?<div className="inlineError"><b>We couldn’t load the diary.</b><span>{availabilityError}</span><small>Try the date again. If it keeps happening, contact Silkcrayon and we’ll help you book.</small></div>:<div className="slotGrid">{slots.length?slots.map(s=><button type="button" className={`slot ${slot?.start===s.start?"selected":""}`} onClick={()=>setSlot(s)} key={s.start}>{s.start}</button>):<p className="muted">No spaces available for this duration on this date. Try another day above.</p>}</div>}</div></div>
    </>}

    <div className="bookingSection"><span className="step">{mode==="pack"?"03":"04"}</span><div><h2>{mode==="pack"?"Add your studio hours":"Tell us about you"}</h2><div className="formGrid">
      <label className="field"><span>Your name</span><input name="fullName" required/></label><label className="field"><span>Email</span><input name="email" type="email" required/></label>
      {mode==="session"&&<><label className="field"><span>Artist name</span><input name="artistName"/></label><label className="field"><span>Phone</span><input name="phone" type="tel"/></label><label className="field"><span>Genre / style</span><input name="genre"/></label><label className="field"><span>Preferred engineer <small>Optional</small></span><select name="preferredEngineerUserId"><option value="">No preference — assign anyone</option>{engineers.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select></label><label className="field full"><span>What are you making?</span><textarea name="notes" rows="4" placeholder="Tell us what you're working on and what you want to leave the session with."/></label></>}
    </div>
    <label className="check policyCheck"><input type="checkbox" name="policyAccepted" required/><span><b>I agree to Silkcrayon’s <a href="/terms" target="_blank">Terms & Conditions</a>, <a href="/cancellation-policy" target="_blank">Cancellation Policy</a> and <a href="/no-harmful-music-policy" target="_blank">No Harmful Music Policy</a>.</b> I have also read the <a href="/privacy" target="_blank">Privacy Policy</a>.</span></label>
    {mode==="session"&&<div className="communicationChoices"><p className="serviceTextNote">If you add a mobile number, Silkcrayon may send essential booking confirmations and reminders. These messages are about your session only.</p><details className="marketingPreferences"><summary>Studio offers & updates <span>Optional</span></summary><p>Choose how you’d like to hear about future offers.</p><label className="check compactChoice signupReward"><input type="checkbox" name="marketingConsent"/><span><b>Email — get 5% off your next session</b><small>Join the Silkcrayon list.</small></span></label><label className="check compactChoice"><input type="checkbox" name="smsMarketingConsent"/><span>Text message <small>Reply STOP to opt out.</small></span></label></details></div>}
    </div></div>
    {error&&<div className="errorBox">{error}</div>}
    {checkoutReady&&<div className="checkoutBar ready"><div><small>{mode==="pack"?"Your studio credit":"Your booking"}</small><b>{mode==="pack"?`${packHours} hours · £${packPrice} · save £${packSaving}`:`${services[service].name} · ${date} at ${slot.start}`}</b></div><button className="button primary" disabled={submitting}>{submitting?"Opening secure checkout…":mode==="pack"?"Buy studio hours →":"Continue to payment →"}</button></div>}
  </form>
}

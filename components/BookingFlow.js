"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const services = {
  "vocal-recording": { name: "Vocal Recording", durations: [60,120,180,240,300,360,420] },
  "dry-hire": { name: "Studio Dry Hire", durations: [120,180,240,300,360,420,480] },
  "full-day": { name: "Full Day Studio", durations: [480] },
  "artist-development": { name: "Artist Development Session", durations: [60] },
  "system-test": { name: "30p Test Booking", durations: [60] },
};

function durationLabel(m) { return m >= 60 ? `${m/60} ${m === 60 ? "hour" : "hours"}` : `${m} mins`; }
function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function nextBookableDays(count = 18) {
  const out = [];
  const d = new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate() + 1);
  while (out.length < count) {
    if (d.getDay() !== 0) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
function prettyDay(d) {
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    day: d.getDate(),
    month: d.toLocaleDateString("en-GB", { month: "short" }),
  };
}

export default function BookingFlow({promotions=[],pricing={}}) {
  const params = useSearchParams();
  const showTest = params.get("test") === "1";
  const requestedService=params.get("service");
  const promo=promotions.find(p=>p.showOnBooking&&p.serviceSlug==="vocal-recording"&&Number(p.durationMinutes)===120)||null;
  const initial = requestedService && services[requestedService] && (requestedService!=="system-test"||showTest) ? requestedService : "vocal-recording";
  const quickDates = useMemo(() => nextBookableDays(18), []);
  const [service, setService] = useState(initial);
  const requestedDuration=Number(params.get("duration"));
  const initialDuration=services[initial].durations.includes(requestedDuration)?requestedDuration:services[initial].durations[0];
  const [duration, setDuration] = useState(initialDuration);
  const [date, setDate] = useState(() => isoLocal(nextBookableDays(1)[0]));
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detailsReady, setDetailsReady] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const availabilityRequest = useRef(0);

  function chooseService(slug) {
    const next=services[slug];
    if(!next) return;
    setAvailabilityError("");
    setDetailsReady(false);
    setSlots([]);
    setSlot(null);
    // Set service + its valid default duration in the same interaction so an
    // intermediate "new service / old duration" request can never be sent.
    setService(slug);
    setDuration(next.durations[0]);
  }
  useEffect(() => { fetch("/api/public/engineers").then(r=>r.json()).then(j=>setEngineers(j.engineers||[])).catch(()=>setEngineers([])); }, []);
  useEffect(() => {
    const currentService=services[service];
    if (!date || !currentService || !currentService.durations.includes(Number(duration))) return;

    const requestId=++availabilityRequest.current;
    const controller=new AbortController();
    setLoadingSlots(true);
    setSlot(null);
    setSlots([]);
    setAvailabilityError("");
    setError("");

    const q=new URLSearchParams({date,service,duration:String(duration)});
    fetch(`/api/availability?${q.toString()}`,{signal:controller.signal})
      .then(async r => {
        const j=await r.json().catch(()=>({}));
        if (!r.ok) throw new Error(j.error || "Could not load availability");
        return j;
      })
      .then(j => {
        if(requestId!==availabilityRequest.current) return;
        setSlots(Array.isArray(j.slots)?j.slots:[]);
      })
      .catch(e => {
        if(e?.name==="AbortError"||requestId!==availabilityRequest.current) return;
        setSlots([]);
        setAvailabilityError(e.message || "Could not load availability");
      })
      .finally(() => {
        if(requestId===availabilityRequest.current)setLoadingSlots(false);
      });

    return () => controller.abort();
  }, [date, duration, service]);

  const minDate = useMemo(() => isoLocal(new Date()), []);

  async function submit(e) {
    e.preventDefault();
    if (!slot) return setError("Choose a time first.");
    setSubmitting(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    body.service = service; body.duration = duration; body.date = date; body.start = slot.start; body.end = slot.end;
    body.marketingConsent = fd.get("marketingConsent") === "on";
    body.smsServiceConsent = Boolean(String(body.phone||"").trim());
    body.smsMarketingConsent = fd.get("smsMarketingConsent") === "on";
    if(service==="dry-hire"){ body.preferredEngineerUserId=""; body.preferredEngineerName=""; }
    else body.preferredEngineerName = engineers.find(x=>x.id===body.preferredEngineerUserId)?.name || "";
    body.policyAccepted = fd.get("policyAccepted") === "on"; body.harmfulMusicPolicy = body.policyAccepted;
    body.dryHireAccepted = fd.get("dryHireAccepted") === "on";
    body.dryHireAgeAccepted = fd.get("dryHireAgeAccepted") === "on";
    try {
      const res = await fetch("/api/checkout", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create booking");
      window.location.href = data.url;
    } catch (e) { setError(e.message); setSubmitting(false); }
  }

  function updateReadiness(e) {
    const form = e.currentTarget;
    const fullName = form.elements.fullName?.value?.trim();
    const email = form.elements.email?.value?.trim();
    const policy = form.elements.policyAccepted?.checked;
    const dryHirePolicy = service!=="dry-hire" || form.elements.dryHireAccepted?.checked;
    const dryHireAge = service!=="dry-hire" || form.elements.dryHireAgeAccepted?.checked;
    const dryHireContact = service!=="dry-hire" || (form.elements.phone?.value?.trim() && form.elements.postcode?.value?.trim());
    setDetailsReady(Boolean(fullName && email && policy && dryHirePolicy && dryHireAge && dryHireContact && form.elements.email?.checkValidity()));
  }

  const checkoutReady = Boolean(slot && detailsReady);
  const money=p=>`£${(Number(p||0)/100).toFixed(Number(p||0)%100?2:0)}`;
  const livePrice=(slug,d)=>{
    if(slug==="system-test") return "£0.30";
    if(slug==="full-day") return money(pricing.fullDayPricePence||40000);
    if(slug==="artist-development") return "£75";
    if(slug==="dry-hire") return money(Math.round((Number(d)||0)/60*4000));
    return money(Math.round((Number(d)||0)/60*(pricing.studioHourlyPricePence||5000)));
  };
  const serviceCardPrice=slug=>{
    if(slug==="artist-development") return "£75 · 60 minutes";
    if(slug==="full-day") return money(pricing.fullDayPricePence||40000);
    if(slug==="system-test") return "£0.30";
    if(slug==="dry-hire") return "£40 / hour · 2h minimum";
    return `${money(pricing.studioHourlyPricePence||5000)} / hour`;
  };

  return (
    <form className={`bookingPanel ${service==="artist-development"?"artistDevelopmentBooking":""}`} onSubmit={submit} onInput={updateReadiness} onChange={updateReadiness}>
      <div className="bookingSection"><span className="step">01</span><div><h2>Choose your session</h2><div className="optionGrid">{Object.entries(services).filter(([slug])=>slug!=="system-test"||showTest).map(([slug,s])=><button type="button" key={slug} className={`option ${service===slug?"active":""} ${slug==="vocal-recording"&&promo?"hasPromoSticker":""}`} onClick={()=>chooseService(slug)}><b>{s.name}</b><small>{serviceCardPrice(slug)}</small>{slug==="dry-hire"&&<span className="dryHireMini">NO ENGINEER INCLUDED</span>}{slug==="vocal-recording"&&promo&&<span className="promoSticker"><i>RELAUNCH</i><strong>2 HOURS</strong><em>£{promo.offerPricePence/100}</em></span>}</button>)}<a className="option optionLink" href="/buy-hours"><b>Studio Hour Packs</b><small>3–10 hours · better rates · date later</small><span>→</span></a><a className="option optionLink giftOption" href="/gift-studio-time"><b>Gift Studio Time</b><small>Choose 1–8 hours</small><span>→</span></a></div></div></div>

      <div className="bookingSection"><span className="step">02</span><div><h2>Choose duration & date</h2><div className="durationRow">{services[service].durations.map(d=>{const offer=promotions.find(p=>p.showOnBooking&&p.serviceSlug===service&&Number(p.durationMinutes)===d);return <button type="button" className={`${duration===d?"activePill":"pill"} ${offer?"offerPill":""}`} key={d} onClick={()=>setDuration(d)}><span>{durationLabel(d)} · {offer?`£${offer.offerPricePence/100}`:livePrice(service,d)}</span>{offer&&<small><s>£{offer.normalPricePence/100}</s> · SAVE £{(offer.normalPricePence-offer.offerPricePence)/100} · OFFER</small>}</button>})}</div>
        <p className="dateHint">Choose a day — no typing required.</p>
        <div className="dateGrid">{quickDates.map(d=>{const v=isoLocal(d); const p=prettyDay(d); return <button type="button" key={v} className={`dateCard ${date===v?"selected":""}`} onClick={()=>setDate(v)}><span>{p.weekday}</span><b>{p.day}</b><small>{p.month}</small></button>})}</div>
        <details className="moreDates"><summary>Choose a later date</summary><label className="field"><span>Date</span><input type="date" value={date} min={minDate} onChange={e=>setDate(e.target.value)} required /></label></details>
      </div></div>

      <div className="bookingSection"><span className="step">03</span><div><h2>Pick a time</h2>
        {loadingSlots ? <p className="muted">Checking the diary…</p> : availabilityError ? <div className="inlineError"><b>We couldn’t load the diary.</b><span>{availabilityError}</span><small>Try the date again. If it keeps happening, contact Silkcrayon and we’ll help you book.</small></div> : <div className="slotGrid">{slots.length ? slots.map(s=><button type="button" className={`slot ${slot?.start===s.start?"selected":""}`} onClick={()=>setSlot(s)} key={s.start}>{s.start}</button>) : <p className="muted">No spaces available for this duration on this date. Try another day above.</p>}</div>}
      </div></div>

      <div className="bookingSection"><span className="step">04</span><div><h2>Tell us about you</h2><div className="formGrid"><label className="field"><span>Your name</span><input name="fullName" required /></label><label className="field"><span>Artist name</span><input name="artistName" /></label><label className="field"><span>Email</span><input name="email" type="email" required /></label><label className="field"><span>Phone{service==="dry-hire"&&" · required for dry hire"}</span><input name="phone" type="tel" required={service==="dry-hire"} /></label>{service==="dry-hire"&&<label className="field"><span>Home postcode</span><input name="postcode" autoComplete="postal-code" required placeholder="e.g. CF10 5EQ" /></label>}<label className="field"><span>Genre / style</span><input name="genre" /></label><label className="field"><span>Instagram / social handle <small>Optional</small></span><input name="instagram" placeholder="@artist" autoCapitalize="none" /></label>{service!=="dry-hire"&&<label className="field"><span>Preferred engineer <small>Optional</small></span><select name="preferredEngineerUserId"><option value="">No preference — assign anyone</option>{engineers.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select></label>}<label className="field full"><span>What are you making?</span><textarea name="notes" rows="4" placeholder="Tell us what you're working on and what you want to leave the session with." /></label></div>{service==="dry-hire"&&<div className="dryHireBookingNotice"><b>Dry Hire · £40/hr · 2-hour minimum</b><p>No Silkcrayon engineer is included. You or your own engineer must be able to operate the session. Silkcrayon staff may remain on-site and will manage access to the studio.</p><label className="check policyCheck"><input type="checkbox" name="dryHireAgeAccepted" required/> <span><b>I am the lead hirer and I am 18 or over.</b> I understand Silkcrayon requires photo-ID verification before dry-hire access.</span></label><label className="check policyCheck"><input type="checkbox" name="dryHireAccepted" required/> <span><b>I agree to the <a href="/dry-hire-terms" target="_blank">Dry Hire Terms</a>.</b> I understand that I am responsible for the room, equipment and guests during the hire and that engineer/production services are not included.</span></label></div>}<label className="check policyCheck"><input type="checkbox" name="policyAccepted" required/> <span><b>I agree to Silkcrayon’s <a href="/terms" target="_blank">Terms & Conditions</a>, <a href="/cancellation-policy" target="_blank">Cancellation Policy</a> and <a href="/no-harmful-music-policy" target="_blank">No Harmful Music Policy</a>.</b> I have also read the <a href="/privacy" target="_blank">Privacy Policy</a>.</span></label><div className="communicationChoices"><p className="serviceTextNote">If you add a mobile number, Silkcrayon may send essential booking confirmations and reminders. These messages are about your session only.</p><details className="marketingPreferences"><summary>Studio offers & updates <span>Optional</span></summary><p>Choose how you’d like to hear about future offers. These are separate from essential booking emails.</p><label className="check compactChoice signupReward"><input type="checkbox" name="marketingConsent"/> <span><b>Email — get 5% off your next session</b><small>Join the Silkcrayon list. Your one-time 5% reward is saved to your account automatically.</small></span></label><label className="check compactChoice"><input type="checkbox" name="smsMarketingConsent"/> <span>Text message <small>Reply STOP to opt out.</small></span></label></details></div></div></div>
      {service==="artist-development"&&<div className="bookingSection artistDevelopmentQuestions"><span className="step">05</span><div><p className="eyebrow">Before your development session</p><h2>Give us the useful context.</h2><p className="muted">You do not need polished answers. This simply helps Nathan or Toni prepare for the conversation.</p><div className="formGrid"><label className="field full"><span>What are you trying to achieve?</span><textarea name="developmentGoal" rows="3" required placeholder="For example: release my first single, choose from a backlog, build confidence or understand Spotify distribution."/></label><label className="field full"><span>What is currently stopping you?</span><textarea name="developmentBlocker" rows="3" required placeholder="Tell us honestly—time, fear, perfectionism, organisation, technical knowledge or something else."/></label><label className="field"><span>How much unreleased music do you have? <small>Optional</small></span><input name="developmentBacklog" placeholder="e.g. 3 finished songs and 10 demos"/></label><label className="field"><span>Music or artist link <small>Optional</small></span><input name="developmentMusicLink" type="url" placeholder="Spotify, SoundCloud or private link"/></label><label className="field full"><span>What would make this hour feel worthwhile?</span><textarea name="developmentOutcome" rows="3" required/></label><label className="field"><span>Session format</span><select name="developmentFormat" defaultValue="in_person"><option value="in_person">In person at Silkcrayon</option><option value="online">Online video call</option></select></label></div></div></div>}
      {error && <div className="errorBox">{error}</div>}
      {checkoutReady&&<div className="checkoutBar ready"><div><small>Your booking</small><b>{services[service].name} · {date} at {slot.start}</b></div><button className="button primary" disabled={submitting}>{submitting?"Opening secure checkout…":"Continue to payment →"}</button></div>}
    </form>
  );
}

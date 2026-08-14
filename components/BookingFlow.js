"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const services = {
  "vocal-recording": { name: "Vocal Recording", durations: [60,120,180,240,300,360,420], price: (d)=>`£${d}` },
  "full-day": { name: "Full Day Studio", durations: [480], price: ()=>"£450" },
  "system-test": { name: "30p Test Booking", durations: [60], price: ()=>"£0.30" },
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

export default function BookingFlow() {
  const params = useSearchParams();
  const showTest = params.get("test") === "1";
  const requestedService=params.get("service");
  const initial = requestedService && services[requestedService] && (requestedService!=="system-test"||showTest) ? requestedService : "vocal-recording";
  const quickDates = useMemo(() => nextBookableDays(18), []);
  const [service, setService] = useState(initial);
  const [duration, setDuration] = useState(services[initial].durations[0]);
  const [date, setDate] = useState(() => isoLocal(nextBookableDays(1)[0]));
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detailsReady, setDetailsReady] = useState(false);
  const [engineers, setEngineers] = useState([]);

  useEffect(() => { setDuration(services[service].durations[0]); setSlot(null); }, [service]);
  useEffect(() => { fetch("/api/public/engineers").then(r=>r.json()).then(j=>setEngineers(j.engineers||[])).catch(()=>setEngineers([])); }, []);
  useEffect(() => {
    if (!date || !duration) return;
    setLoadingSlots(true); setSlot(null); setAvailabilityError(""); setError("");
    fetch(`/api/availability?date=${date}&service=${service}&duration=${duration}`)
      .then(r => r.json().then(j => ({ok:r.ok, j})))
      .then(({ok,j}) => {
        if (!ok) throw new Error(j.error || "Could not load availability");
        setSlots(j.slots || []);
      })
      .catch(e => { setSlots([]); setAvailabilityError(e.message || "Could not load availability"); })
      .finally(() => setLoadingSlots(false));
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
    body.preferredEngineerName = engineers.find(x=>x.id===body.preferredEngineerUserId)?.name || "";
    body.policyAccepted = fd.get("policyAccepted") === "on"; body.harmfulMusicPolicy = body.policyAccepted;
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
    setDetailsReady(Boolean(fullName && email && policy && form.elements.email?.checkValidity()));
  }

  const checkoutReady = Boolean(slot && detailsReady);

  return (
    <form className="bookingPanel" onSubmit={submit} onInput={updateReadiness} onChange={updateReadiness}>
      <div className="bookingSection"><span className="step">01</span><div><h2>Choose your session</h2><div className="optionGrid">{Object.entries(services).filter(([slug])=>slug!=="system-test"||showTest).map(([slug,s])=><button type="button" key={slug} className={`option ${service===slug?"active":""}`} onClick={()=>setService(slug)}><b>{s.name}</b><small>{slug==="full-day"?"£450":slug==="system-test"?"£0.30":"£60 / hour"}</small></button>)}</div></div></div>

      <div className="bookingSection"><span className="step">02</span><div><h2>Choose duration & date</h2><div className="durationRow">{services[service].durations.map(d=><button type="button" className={duration===d?"activePill":"pill"} key={d} onClick={()=>setDuration(d)}>{durationLabel(d)} · {services[service].price(d)}</button>)}</div>
        <p className="dateHint">Choose a day — no typing required.</p>
        <div className="dateGrid">{quickDates.map(d=>{const v=isoLocal(d); const p=prettyDay(d); return <button type="button" key={v} className={`dateCard ${date===v?"selected":""}`} onClick={()=>setDate(v)}><span>{p.weekday}</span><b>{p.day}</b><small>{p.month}</small></button>})}</div>
        <details className="moreDates"><summary>Choose a later date</summary><label className="field"><span>Date</span><input type="date" value={date} min={minDate} onChange={e=>setDate(e.target.value)} required /></label></details>
      </div></div>

      <div className="bookingSection"><span className="step">03</span><div><h2>Pick a time</h2>
        {loadingSlots ? <p className="muted">Checking the diary…</p> : availabilityError ? <div className="inlineError"><b>We couldn’t load the diary.</b><span>{availabilityError}</span><small>If you just added Vercel environment variables, redeploy the latest deployment and try again.</small></div> : <div className="slotGrid">{slots.length ? slots.map(s=><button type="button" className={`slot ${slot?.start===s.start?"selected":""}`} onClick={()=>setSlot(s)} key={s.start}>{s.start}</button>) : <p className="muted">No spaces available for this duration on this date. Try another day above.</p>}</div>}
      </div></div>

      <div className="bookingSection"><span className="step">04</span><div><h2>Tell us about you</h2><div className="formGrid"><label className="field"><span>Your name</span><input name="fullName" required /></label><label className="field"><span>Artist name</span><input name="artistName" /></label><label className="field"><span>Email</span><input name="email" type="email" required /></label><label className="field"><span>Phone</span><input name="phone" type="tel" /></label><label className="field"><span>Genre / style</span><input name="genre" /></label><label className="field"><span>Preferred engineer <small>Optional</small></span><select name="preferredEngineerUserId"><option value="">No preference — assign anyone</option>{engineers.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select></label><label className="field full"><span>What are you making?</span><textarea name="notes" rows="4" placeholder="Tell us what you're working on and what you want to leave the session with." /></label></div><label className="check policyCheck"><input type="checkbox" name="policyAccepted" required/> <span><b>I agree to Silkcrayon’s <a href="/terms" target="_blank">Terms & Conditions</a>, <a href="/cancellation-policy" target="_blank">Cancellation Policy</a> and <a href="/no-harmful-music-policy" target="_blank">No Harmful Music Policy</a>.</b> I have also read the <a href="/privacy" target="_blank">Privacy Policy</a>.</span></label><div className="communicationChoices"><p className="serviceTextNote">If you add a mobile number, Silkcrayon may send essential booking confirmations and reminders. These messages are about your session only.</p><details className="marketingPreferences"><summary>Studio offers & updates <span>Optional</span></summary><p>Choose how you’d like to hear about future offers. These are separate from essential booking emails.</p><label className="check compactChoice signupReward"><input type="checkbox" name="marketingConsent"/> <span><b>Email — get 5% off your next session</b><small>Join the Silkcrayon list. Your one-time 5% reward is saved to your account automatically.</small></span></label><label className="check compactChoice"><input type="checkbox" name="smsMarketingConsent"/> <span>Text message <small>Reply STOP to opt out.</small></span></label></details></div></div></div>
      {error && <div className="errorBox">{error}</div>}
      {checkoutReady&&<div className="checkoutBar ready"><div><small>Your booking</small><b>{services[service].name} · {date} at {slot.start}</b></div><button className="button primary" disabled={submitting}>{submitting?"Opening secure checkout…":"Continue to payment →"}</button></div>}
    </form>
  );
}

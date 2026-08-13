"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const services = {
  "vocal-recording": { name: "Vocal Recording", durations: [60,120,180,240], price: (d)=>`£${d}` },
  "artist-development": { name: "Artist Development & Industry Guidance", durations: [60,120], price: (d)=>`£${d}` },
  "full-day": { name: "Full Day Studio", durations: [480], price: ()=>"£450" },
};

function durationLabel(m) { return m >= 60 ? `${m/60} ${m === 60 ? "hour" : "hours"}` : `${m} mins`; }

export default function BookingFlow() {
  const params = useSearchParams();
  const initial = params.get("service") && services[params.get("service")] ? params.get("service") : "vocal-recording";
  const [service, setService] = useState(initial);
  const [duration, setDuration] = useState(services[initial].durations[0]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setDuration(services[service].durations[0]); setSlot(null); }, [service]);
  useEffect(() => {
    if (!date || !duration) return;
    setLoadingSlots(true); setSlot(null); setError("");
    fetch(`/api/availability?date=${date}&service=${service}&duration=${duration}`)
      .then(r => r.json().then(j => ({ok:r.ok, j})))
      .then(({ok,j}) => { if (!ok) throw new Error(j.error || "Could not load availability"); setSlots(j.slots || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [date, duration, service]);

  const minDate = useMemo(() => new Date().toISOString().slice(0,10), []);

  async function submit(e) {
    e.preventDefault();
    if (!slot) return setError("Choose a time first.");
    setSubmitting(true); setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    body.service = service; body.duration = duration; body.date = date; body.start = slot.start; body.end = slot.end;
    body.marketingConsent = fd.get("marketingConsent") === "on";
    try {
      const res = await fetch("/api/checkout", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create booking");
      window.location.href = data.url;
    } catch (e) { setError(e.message); setSubmitting(false); }
  }

  return (
    <form className="bookingPanel" onSubmit={submit}>
      <div className="bookingSection"><span className="step">01</span><div><h2>Choose your session</h2><div className="optionGrid">{Object.entries(services).map(([slug,s])=><button type="button" key={slug} className={`option ${service===slug?"active":""}`} onClick={()=>setService(slug)}><b>{s.name}</b><small>{slug==="full-day"?"£450":"£60 / hour"}</small></button>)}</div></div></div>
      <div className="bookingSection"><span className="step">02</span><div><h2>Choose duration & date</h2><div className="durationRow">{services[service].durations.map(d=><button type="button" className={duration===d?"activePill":"pill"} key={d} onClick={()=>setDuration(d)}>{durationLabel(d)} · {services[service].price(d)}</button>)}</div><label className="field"><span>Date</span><input type="date" value={date} min={minDate} onChange={e=>setDate(e.target.value)} required /></label></div></div>
      <div className="bookingSection"><span className="step">03</span><div><h2>Pick a time</h2>{loadingSlots?<p className="muted">Checking the diary…</p>:date?<div className="slotGrid">{slots.length?slots.map(s=><button type="button" className={`slot ${slot?.start===s.start?"selected":""}`} onClick={()=>setSlot(s)} key={s.start}>{s.start}</button>):<p className="muted">No spaces available for this duration on this date.</p>}</div>:<p className="muted">Choose a date to see live availability.</p>}</div></div>
      <div className="bookingSection"><span className="step">04</span><div><h2>Tell us about you</h2><div className="formGrid"><label className="field"><span>Your name</span><input name="fullName" required /></label><label className="field"><span>Artist name</span><input name="artistName" /></label><label className="field"><span>Email</span><input name="email" type="email" required /></label><label className="field"><span>Phone</span><input name="phone" type="tel" /></label><label className="field"><span>Genre / style</span><input name="genre" /></label><label className="field full"><span>What are you making?</span><textarea name="notes" rows="4" placeholder="Tell us what you're working on and what you want to leave the session with." /></label></div><label className="check"><input type="checkbox" name="marketingConsent"/> <span>I’m happy to receive occasional Silkcrayon studio updates. Booking emails are sent regardless.</span></label><p className="legal">By continuing you agree that Silkcrayon can store the information required to manage your booking. Add your final Privacy Policy link before launch.</p></div></div>
      {error && <div className="errorBox">{error}</div>}
      <div className="checkoutBar"><div><small>Your booking</small><b>{services[service].name}{slot?` · ${date} at ${slot.start}`:""}</b></div><button className="button primary" disabled={submitting || !slot}>{submitting?"Opening secure checkout…":"Continue to payment →"}</button></div>
    </form>
  );
}

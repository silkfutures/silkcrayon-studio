"use client";

import { useState } from "react";
import BookingFlow from "./BookingFlow";
import StudioHoursStore from "./StudioHoursStore";

/** Top-of-booking choice. Keep the normal booking flow mounted only in session mode. */
export default function BookingModeChooser({promotions, pricing}) {
  const [mode, setMode] = useState("session");
  return <div className="bookingMode">
    <div className="bookingModeSwitch" role="group" aria-label="Booking type">
      <button type="button" className={mode==="session"?"selected":""} onClick={()=>setMode("session")} aria-pressed={mode==="session"}>Book a session</button>
      <button type="button" className={mode==="pass"?"selected":""} onClick={()=>setMode("pass")} aria-pressed={mode==="pass"}>Hour passes</button>
    </div>
    {mode === "session" ? <BookingFlow promotions={promotions} pricing={pricing}/> : <section className="bookingModePass" aria-label="Build your Studio Hour Pass">
      <div className="bookingModePassIntro"><span>STUDIO HOUR PASSES</span><h2>Make time for the music.</h2><p>Build your 60-day pass. Engineer included. All sessions must take place within 60 calendar days of purchase.</p></div>
      <StudioHoursStore pass hourlyPrice={pricing.studioHourlyPricePence / 100}/>
    </section>}
  </div>;
}

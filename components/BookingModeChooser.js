"use client";

import { useState } from "react";
import BookingFlow from "./BookingFlow";
import StudioHoursStore from "./StudioHoursStore";

/** Top-of-booking choice. Keep the normal booking flow mounted only in session mode. */
export default function BookingModeChooser({promotions, pricing}) {
  const [mode, setMode] = useState("session");
  return <div className="bookingMode">
    <div className="bookingModeHeading"><span>CHOOSE YOUR EXPERIENCE</span><h2>What are you booking?</h2></div>
    <div className="bookingModeGrid" role="group" aria-label="Booking type">
      <button type="button" className={`bookingModeCard ${mode === "session" ? "selected" : ""}`} onClick={() => setMode("session")} aria-pressed={mode === "session"}>
        <span className="bookingModeGlyph" aria-hidden="true">◉</span>
        <strong>Book a Session</strong>
        <span>Choose your date, engineer and session time.</span>
        <b>£50/hour</b>
        <span className="bookingModeCheck" aria-hidden="true">{mode === "session" ? "●" : "○"}</span>
      </button>
      <button type="button" className={`bookingModeCard ${mode === "pass" ? "selected" : ""}`} onClick={() => setMode("pass")} aria-pressed={mode === "pass"}>
        <span className="bookingModeGlyph" aria-hidden="true">▤</span>
        <strong>Studio Hour Pass</strong>
        <span>Prepay 4–8 hours. Book across multiple visits.</span>
        <b>From £37.50/hour</b>
        <span className="bookingModeCheck" aria-hidden="true">{mode === "pass" ? "●" : "○"}</span>
      </button>
    </div>
    {mode === "session" ? <BookingFlow promotions={promotions} pricing={pricing}/> : <section className="bookingModePass" aria-label="Build your Studio Hour Pass">
      <div className="bookingModePassIntro"><span>STUDIO HOUR PASSES</span><h2>Make time for the music.</h2><p>Build your 30-day pass. Engineer included. All sessions must take place within 30 calendar days of purchase.</p></div>
      <StudioHoursStore pass hourlyPrice={pricing.studioHourlyPricePence / 100}/>
    </section>}
  </div>;
}

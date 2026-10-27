"use client";
import FormProtection from './FormProtection';

import {useMemo,useState} from "react";

const GIFT_OPTIONS=[1,2,3,4,5,6,7,8];

export default function StudioHoursStore({gift=false,offer=false,relaunch40=false,pass=false,hourlyPrice=50,relaunchPrice=90}){
 const [hours,setHours]=useState(offer||relaunch40?2:gift?2:pass?6:3),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const PASS_PRICES={4:170,5:210,6:240,7:280,8:300};
 const passPrice=h=>PASS_PRICES[h];
 const price=relaunch40?80:offer?relaunchPrice:pass?passPrice(hours):hours*hourlyPrice;
 const listPrice=hours*hourlyPrice;
 const saving=Math.max(0,listPrice-price);
 const effective=price/hours;
 const title=relaunch40?"RELAUNCH40 · PRIVATE OFFER":offer?"RELAUNCH OFFER":gift?"GIFT":pass?"30-DAY STUDIO PASS":"STUDIO HOUR PACK";

 async function submit(e){
  e.preventDefault();setBusy(true);setMsg("Opening secure checkout…");
  const fd=new FormData(e.currentTarget);
  const body={form_token:fd.get("form_token"),website:fd.get("website"),kind:relaunch40?"relaunch40":offer?"relaunch":gift?"gift":pass?"studio_pass":"hours",hours,
   buyerName:String(fd.get("buyerName")||""),buyerEmail:String(fd.get("buyerEmail")||""),
   recipientName:gift?String(fd.get("recipientName")||""):String(fd.get("buyerName")||""),
   recipientEmail:gift?String(fd.get("recipientEmail")||""):String(fd.get("buyerEmail")||""),
   message:gift?String(fd.get("message")||""):""};
  const r=await fetch("/api/store/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){setBusy(false);setMsg(j.error||"Could not start checkout.");return}
  location.href=j.url;
 }

 return <form className={`hoursStore ${offer||relaunch40?"relaunchStore":""}`} onSubmit={submit}><FormProtection/>
   {relaunch40?<div className="relaunchOfferPrice"><div><small>RELAUNCH40 · 30 OCT–2 NOV</small><b>2 hours</b></div><div><strong>£80</strong><span><s>£100</s> · save £20</span></div></div>:offer?<div className="relaunchOfferPrice"><div><small>LIMITED RELAUNCH OFFER</small><b>2 hours</b></div><div><strong>£{relaunchPrice}</strong><span><s>£{2*hourlyPrice}</s> · save £{Math.max(0,2*hourlyPrice-relaunchPrice)}</span></div></div>
   :gift?<div className="hoursChoice">{GIFT_OPTIONS.map(h=><button type="button" key={h} className={hours===h?"active":""} onClick={()=>setHours(h)}><b>{h}h</b><span>£{h*hourlyPrice}</span></button>)}</div>
   :<div className="hourWheel">
      <div className="hourWheelReadout">
       <div><small>CHOOSE YOUR HOURS</small><b>{hours} HOURS</b><span>£{effective.toFixed(effective%1?2:0)}/hour effective rate</span></div>
       <div className="hourWheelPrice"><strong>£{price}</strong><span>Save £{saving}</span></div>
      </div>
      <input aria-label="Choose studio hours" type="range" min={pass?4:3} max={pass?8:10} step="1" value={hours} onChange={e=>setHours(Number(e.target.value))}/>
      <div className="hourWheelTicks">{(pass?[4,5,6,7,8]:[3,4,5,6,7,8,9,10]).map(h=><button type="button" key={h} className={hours===Number(h)?"active":""} onClick={()=>setHours(Number(h))}>{h}h</button>)}</div>
      <div className="hourPackScale">{(pass?[4,5,6,7,8]:[3,4,5,6,7,8,9,10]).map(h=><span key={h} className={hours===h?"active":""}>{h}h · £{(pass?passPrice(h):h*hourlyPrice)}</span>)}</div>
    </div>}
   {pass&&<p className="storeFine"><strong>30-day validity.</strong> All sessions must take place within 30 calendar days of purchase. Any unused pass hours expire. The engineer is included; normal booking and cancellation policies apply.</p>}
   <div className="hoursStoreFields">
    <label><span>{gift?"Your name":"Name"}</span><input required name="buyerName" maxLength="120"/></label>
    <label><span>{gift?"Your email":"Email"}</span><input required type="email" name="buyerEmail" maxLength="254"/></label>
    {gift&&<><label><span>Recipient name</span><input required name="recipientName" maxLength="120"/></label><label><span>Recipient email</span><input required type="email" name="recipientEmail" maxLength="254"/></label><label className="full"><span>Gift message · optional</span><textarea name="message" rows="3" maxLength="500" placeholder="A few words from you…"/></label></>}
   </div>
   <div className="hoursStoreSummary"><div><small>{title}</small><b>{hours} hour{hours===1?"":"s"} · £{price}</b><span>{relaunch40?"One per customer. Buy 30 Oct–2 Nov; record by 30 Nov 2026. Subject to availability.":offer?"One per customer. Buy now and choose the date later.":gift?"No date required. Hours stay on the artist’s Silkcrayon account until they book.":`Usually £${listPrice}. Save £${saving}. ${pass?"Sessions must take place within 30 days of purchase. Unused pass hours expire.":"Use the balance across future sessions."}`}</span></div><button className="button primary" disabled={busy}>{busy?"Opening checkout…":relaunch40?"Get 2 hours for £80 →":offer?`Get 2 hours for £${relaunchPrice} →`:gift?"Buy gift →":"Buy hour pack →"}</button></div>
   {msg&&<p className="muted">{msg}</p>}
 </form>
}

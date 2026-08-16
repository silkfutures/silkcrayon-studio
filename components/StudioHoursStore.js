"use client";
import {useMemo,useState} from "react";

const PACKS={3:170,4:220,5:270,6:320,7:370,8:420,9:470,10:520};
const GIFT_OPTIONS=[1,2,3,4,5,6,7,8];

export default function StudioHoursStore({gift=false,offer=false}){
 const [hours,setHours]=useState(offer?2:gift?2:3),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const price=offer?100:gift?hours*60:PACKS[hours];
 const listPrice=hours*60;
 const saving=Math.max(0,listPrice-price);
 const effective=price/hours;
 const title=offer?"RELAUNCH OFFER":gift?"GIFT":"STUDIO HOUR PACK";

 async function submit(e){
  e.preventDefault();setBusy(true);setMsg("Opening secure checkout…");
  const fd=new FormData(e.currentTarget);
  const body={kind:offer?"relaunch":gift?"gift":"hours",hours,
   buyerName:String(fd.get("buyerName")||""),buyerEmail:String(fd.get("buyerEmail")||""),
   recipientName:gift?String(fd.get("recipientName")||""):String(fd.get("buyerName")||""),
   recipientEmail:gift?String(fd.get("recipientEmail")||""):String(fd.get("buyerEmail")||""),
   message:gift?String(fd.get("message")||""):""};
  const r=await fetch("/api/store/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){setBusy(false);setMsg(j.error||"Could not start checkout.");return}
  location.href=j.url;
 }

 return <form className={`hoursStore ${offer?"relaunchStore":""}`} onSubmit={submit}>
   {offer?<div className="relaunchOfferPrice"><div><small>LIMITED RELAUNCH OFFER</small><b>2 hours</b></div><div><strong>£100</strong><span><s>£120</s> · save £20</span></div></div>
   :gift?<div className="hoursChoice">{GIFT_OPTIONS.map(h=><button type="button" key={h} className={hours===h?"active":""} onClick={()=>setHours(h)}><b>{h}h</b><span>£{h*60}</span></button>)}</div>
   :<div className="hourWheel">
      <div className="hourWheelReadout">
       <div><small>CHOOSE YOUR HOURS</small><b>{hours} HOURS</b><span>£{effective.toFixed(effective%1?2:0)}/hour effective rate</span></div>
       <div className="hourWheelPrice"><strong>£{price}</strong><span>Save £{saving}</span></div>
      </div>
      <input aria-label="Choose studio hours" type="range" min="3" max="10" step="1" value={hours} onChange={e=>setHours(Number(e.target.value))}/>
      <div className="hourWheelTicks">{Object.keys(PACKS).map(h=><button type="button" key={h} className={hours===Number(h)?"active":""} onClick={()=>setHours(Number(h))}>{h}h</button>)}</div>
      <div className="hourPackScale">{Object.entries(PACKS).map(([h,v])=><span key={h} className={hours===Number(h)?"active":""}>{h}h · £{v}</span>)}</div>
    </div>}
   <div className="hoursStoreFields">
    <label><span>{gift?"Your name":"Name"}</span><input required name="buyerName" maxLength="120"/></label>
    <label><span>{gift?"Your email":"Email"}</span><input required type="email" name="buyerEmail" maxLength="254"/></label>
    {gift&&<><label><span>Recipient name</span><input required name="recipientName" maxLength="120"/></label><label><span>Recipient email</span><input required type="email" name="recipientEmail" maxLength="254"/></label><label className="full"><span>Gift message · optional</span><textarea name="message" rows="3" maxLength="500" placeholder="A few words from you…"/></label></>}
   </div>
   <div className="hoursStoreSummary"><div><small>{title}</small><b>{hours} hour{hours===1?"":"s"} · £{price}</b><span>{offer?"One per customer. Buy now and choose the date later.":gift?"No date required. Hours stay on the artist’s Silkcrayon account until they book.":`Usually £${listPrice}. Save £${saving}. Use the balance across future sessions.`}</span></div><button className="button primary" disabled={busy}>{busy?"Opening checkout…":offer?"Get 2 hours for £100 →":gift?"Buy gift →":"Buy hour pack →"}</button></div>
   {msg&&<p className="muted">{msg}</p>}
 </form>
}

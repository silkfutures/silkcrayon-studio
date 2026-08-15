"use client";
import {useState} from "react";
const OPTIONS=[1,2,3,4,5,6,7,8];
export default function StudioHoursStore({gift=false}){
 const [hours,setHours]=useState(2),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function submit(e){
  e.preventDefault();setBusy(true);setMsg("Opening secure checkout…");
  const fd=new FormData(e.currentTarget);
  const body={kind:gift?"gift":"hours",hours,
   buyerName:String(fd.get("buyerName")||""),buyerEmail:String(fd.get("buyerEmail")||""),
   recipientName:gift?String(fd.get("recipientName")||""):String(fd.get("buyerName")||""),
   recipientEmail:gift?String(fd.get("recipientEmail")||""):String(fd.get("buyerEmail")||""),
   message:gift?String(fd.get("message")||""):""};
  const r=await fetch("/api/store/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){setBusy(false);setMsg(j.error||"Could not start checkout.");return}
  location.href=j.url;
 }
 return <form className="hoursStore" onSubmit={submit}>
   <div className="hoursChoice">{OPTIONS.map(h=><button type="button" key={h} className={hours===h?"active":""} onClick={()=>setHours(h)}><b>{h}h</b><span>£{h*60}</span></button>)}</div>
   <div className="hoursStoreFields">
    <label><span>{gift?"Your name":"Name"}</span><input required name="buyerName" maxLength="120"/></label>
    <label><span>{gift?"Your email":"Email"}</span><input required type="email" name="buyerEmail" maxLength="254"/></label>
    {gift&&<><label><span>Recipient name</span><input required name="recipientName" maxLength="120"/></label><label><span>Recipient email</span><input required type="email" name="recipientEmail" maxLength="254"/></label><label className="full"><span>Gift message · optional</span><textarea name="message" rows="3" maxLength="500" placeholder="A few words from you…"/></label></>}
   </div>
   <div className="hoursStoreSummary"><div><small>{gift?"GIFT":"STUDIO HOURS"}</small><b>{hours} hour{hours===1?"":"s"} · £{hours*60}</b><span>No date required. Hours stay on the artist’s Silkcrayon account until they book.</span></div><button className="button primary" disabled={busy}>{busy?"Opening checkout…":gift?"Buy gift →":"Buy hours →"}</button></div>
   {msg&&<p className="muted">{msg}</p>}
 </form>
}

"use client";
import {useState} from "react";
const display=p=>(Number(p||0)/100).toFixed(Number(p||0)%100?2:0);
export default function StudioSettingsForm({initial}){
 const [hourly,setHourly]=useState(display(initial.studioHourlyPricePence));
 const [fullDay,setFullDay]=useState(display(initial.fullDayPricePence));
 const [relaunch,setRelaunch]=useState(display(initial.relaunchOfferPricePence));
 const [finish,setFinish]=useState(display(initial.studioFinishPricePence));
 const [turnaround,setTurnaround]=useState(initial.studioFinishTurnaround);
 const [revisions,setRevisions]=useState(String(initial.studioFinishRevisions));
 const [state,setState]=useState(""),[busy,setBusy]=useState(false);
 async function save(e){e.preventDefault();setBusy(true);setState("Saving…");const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({studioHourlyPrice:Number(hourly),fullDayPrice:Number(fullDay),relaunchOfferPrice:Number(relaunch),studioFinishPrice:Number(finish),studioFinishTurnaround:turnaround,studioFinishRevisions:Number(revisions)})});const j=await r.json().catch(()=>({}));setBusy(false);setState(r.ok?"Saved. New bookings, payments and upsells now use these prices.":j.error||"Could not save settings.");}
 const moneyField=(id,label,value,setValue,help)=><div className="settingsField"><label htmlFor={id}>{label}</label><div className="moneyInput"><span>£</span><input id={id} inputMode="decimal" min="0.3" max="10000" step="0.01" required value={value} onChange={e=>setValue(e.target.value)}/></div><small>{help}</small></div>;
 return <form className="studioSettingsForm commercialSettingsForm" onSubmit={save}>
  {moneyField("hourlyPrice","Standard studio price",hourly,setHourly,"Per hour. Used for recording bookings, prepaid hours and manual session defaults.")}
  {moneyField("fullDayPrice","Full day price",fullDay,setFullDay,"8-hour full-day booking price.")}
  {moneyField("relaunchPrice","2-hour relaunch offer",relaunch,setRelaunch,"Updates the current RELAUNCH_2H_100 promotion price. Normal value is calculated from the hourly price.")}
  {moneyField("finishPrice","Studio Finish price",finish,setFinish,"Per track. Existing paid orders keep their historical purchase price.")}
  <div className="settingsField"><label htmlFor="finishTurnaround">Studio Finish turnaround</label><input id="finishTurnaround" maxLength="80" required value={turnaround} onChange={e=>setTurnaround(e.target.value)} placeholder="within 7 days"/><small>Shown to customers at checkout.</small></div>
  <div className="settingsField"><label htmlFor="finishRevisions">Included revisions</label><input id="finishRevisions" type="number" min="0" max="20" step="1" required value={revisions} onChange={e=>setRevisions(e.target.value)}/></div>
  <div className="settingsSaveRow"><button className="button primary" disabled={busy}>{busy?"Saving…":"Save all pricing"}</button>{state&&<span>{state}</span>}</div>
 </form>;
}

"use client";
import {useState} from "react";
export default function StudioSettingsForm({initial}){
 const [price,setPrice]=useState((initial.studioFinishPricePence/100).toFixed(0));
 const [turnaround,setTurnaround]=useState(initial.studioFinishTurnaround);
 const [revisions,setRevisions]=useState(String(initial.studioFinishRevisions));
 const [state,setState]=useState(""),[busy,setBusy]=useState(false);
 async function save(e){e.preventDefault();setBusy(true);setState("Saving…");const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({studioFinishPrice:Number(price),studioFinishTurnaround:turnaround,studioFinishRevisions:Number(revisions)})});const j=await r.json().catch(()=>({}));setBusy(false);setState(r.ok?"Saved. New Studio Finish purchases will use these settings.":j.error||"Could not save settings.");}
 return <form className="studioSettingsForm" onSubmit={save}>
  <div className="settingsField"><label htmlFor="finishPrice">Studio Finish price</label><div className="moneyInput"><span>£</span><input id="finishPrice" inputMode="decimal" min="0.3" max="10000" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)}/></div><small>Per track. Existing paid orders keep their original purchase price.</small></div>
  <div className="settingsField"><label htmlFor="finishTurnaround">Turnaround</label><input id="finishTurnaround" maxLength="80" required value={turnaround} onChange={e=>setTurnaround(e.target.value)} placeholder="within 7 days"/><small>Shown to customers at checkout.</small></div>
  <div className="settingsField"><label htmlFor="finishRevisions">Included revisions</label><input id="finishRevisions" type="number" min="0" max="20" step="1" required value={revisions} onChange={e=>setRevisions(e.target.value)}/></div>
  <div className="settingsSaveRow"><button className="button primary" disabled={busy}>{busy?"Saving…":"Save Studio Finish settings"}</button>{state&&<span>{state}</span>}</div>
 </form>
}
'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';
export default function EngineerWorkSettingsForm({initial}){
 const router=useRouter();
 const [v,setV]=useState({windowHours:String(initial.windowHours),urgentWindowHours:String(initial.urgentWindowHours),urgentThresholdHours:String(initial.urgentThresholdHours),cutoffHours:String(initial.cutoffHours),dryHireAccessFee:(Number(initial.dryHireAccessFeePence??2000)/100).toFixed(2),autoPayouts:initial.autoPayouts});
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const set=k=>e=>setV(x=>({...x,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
 async function save(e){e.preventDefault();setBusy(true);setMsg('Saving…');try{const r=await fetch('/api/admin/settings/engineer-work',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...v,windowHours:Number(v.windowHours),urgentWindowHours:Number(v.urgentWindowHours),urgentThresholdHours:Number(v.urgentThresholdHours),cutoffHours:Number(v.cutoffHours),dryHireAccessFee:Number(v.dryHireAccessFee)})});const j=await r.json().catch(()=>({}));setMsg(r.ok?'Saved. Applies to offers sent from now on.':j.error||'Could not save.');if(r.ok)router.refresh();}catch{setMsg('Network problem — please retry.');}setBusy(false);}
 const num=(k,label,help,step='0.25')=><label className={s.field}><span>{label}</span><input type="number" min="0" step={step} required value={v[k]} onChange={set(k)}/><small>{help}</small></label>;
 return <form onSubmit={save} className={s.form}>
  <div className={s.settingsGrid}>
   {num('windowHours','Response window (hours)','How long an engineer has to accept or decline.')}
   {num('urgentWindowHours','Urgent response window (hours)','Used instead when the session is coming up soon.')}
   {num('urgentThresholdHours','“Coming up soon” means within (hours)','e.g. 48 = sessions in the next two days use the urgent window.','1')}
   {num('cutoffHours','Stop offering this long before the session (hours)','If nobody has accepted by then, you get an alert.')}
   {num('dryHireAccessFee','Dry hire open & close fee (£)','Default flat fee offered for opening and locking up a dry hire. You can change it on each offer.','0.01')}
  </div>
  <label className={s.check}><input type="checkbox" checked={v.autoPayouts} onChange={set('autoPayouts')}/><span><b>Pay engineers automatically</b><br/><small className={s.muted}>When on, routine sessions are paid as soon as the engineer completes the session report and the booked end time has passed. Flagged issues, hour differences and extra time always wait for you.</small></span></label>
  <div className={s.row}><button className={s.primary} disabled={busy}>{busy?'Saving…':'Save engineer settings'}</button>{msg&&<span className={s.message} role="status">{msg}</span>}</div>
 </form>;
}

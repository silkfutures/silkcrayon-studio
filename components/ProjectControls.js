'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';
const statuses=['quoted','accepted','deposit_due','scheduled','recording','post_production','delivered','lost'];
export default function ProjectControls({project}){
 const router=useRouter();
 const [status,setStatus]=useState(project.status),[recording,setRecording]=useState(String((project.recording_amount_pence||0)/100)),[post,setPost]=useState(String((project.post_amount_pence||0)/100)),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const total=Number(recording||0)+Number(post||0);
 async function save(e){e.preventDefault();setBusy(true);setMsg('Saving…');const r=await fetch(`/api/admin/projects/${project.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status,recordingPounds:Number(recording||0),postPounds:Number(post||0)})});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?'Saved ✓':j.error||'Could not save.');if(r.ok)router.refresh()}
 return <form className="projectControls" onSubmit={save}>
  <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
  <label>Recording fee (£)<input type="number" min="0" step="1" value={recording} onChange={e=>setRecording(e.target.value)}/><small>Studio time + recording engineer + raw recorded files.</small></label>
  <label>Post-production (£)<input type="number" min="0" step="1" value={post} onChange={e=>setPost(e.target.value)}/><small>Editing, mixing, mastering, episode assembly, exports or video edit.</small></label>
  <div className="quoteSplitPreview"><span>Recording <b>£{Number(recording||0).toLocaleString('en-GB')}</b></span><span>Post-production <b>£{Number(post||0).toLocaleString('en-GB')}</b></span><span>Total quote <b>£{total.toLocaleString('en-GB')}</b></span></div>
  <button disabled={busy}>{busy?'Saving…':'Save project'}</button>{msg&&<small>{msg}</small>}
 </form>;
}

'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';
const statuses=['quoted','accepted','deposit_due','scheduled','recording','post_production','delivered','lost'];
function pounds(p){return String(Number(p||0)/100)}
function money(v){return `£${Number(v||0).toLocaleString('en-GB')}`}
export default function ProjectControls({project,linkedSessionCount=0}){
 const router=useRouter();
 const legacyRecording=Number(project.recording_amount_pence||0),legacyPost=Number(project.post_amount_pence||0);
 const hasBreakdown=['audio_recording_amount_pence','video_production_amount_pence','audio_post_amount_pence','video_post_amount_pence'].some(k=>Number(project[k]||0)>0);
 const [status,setStatus]=useState(project.status);
 const [audioRecording,setAudioRecording]=useState(pounds(hasBreakdown?project.audio_recording_amount_pence:legacyRecording));
 const [videoProduction,setVideoProduction]=useState(pounds(project.video_production_amount_pence));
 const [audioPost,setAudioPost]=useState(pounds(hasBreakdown?project.audio_post_amount_pence:legacyPost));
 const [videoPost,setVideoPost]=useState(pounds(project.video_post_amount_pence));
 const [msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState(false);
 const total=Number(audioRecording||0)+Number(videoProduction||0)+Number(audioPost||0)+Number(videoPost||0);
 async function save(e){e.preventDefault();setBusy(true);setMsg('Saving…');const r=await fetch(`/api/admin/projects/${project.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status,audioRecordingPounds:Number(audioRecording||0),videoProductionPounds:Number(videoProduction||0),audioPostPounds:Number(audioPost||0),videoPostPounds:Number(videoPost||0)})});const j=await r.json().catch(()=>({}));setBusy(false);setMsg(r.ok?'Saved ✓':j.error||'Could not save.');if(r.ok)router.refresh()}
 async function remove(){
  const sessionText=linkedSessionCount?`\n\n${linkedSessionCount} linked session${linkedSessionCount===1?'':'s'} will be kept in Sessions and unlinked from this project.`:'';
  if(!window.confirm(`Delete “${project.title}”?${sessionText}\n\nThe customer and historical session records will not be deleted.`))return;
  setDeleting(true);setMsg('Deleting project…');
  const r=await fetch(`/api/admin/projects/${project.id}`,{method:'DELETE'});const j=await r.json().catch(()=>({}));
  if(!r.ok){setDeleting(false);setMsg(j.error||'Could not delete project.');return}
  router.push('/admin/projects');router.refresh();
 }
 return <div><form className="projectControls" onSubmit={save}>
  <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>
  <label>Audio recording (£)<input type="number" min="0" step="1" value={audioRecording} onChange={e=>setAudioRecording(e.target.value)}/><small>Studio time + audio engineer + organised raw audio files.</small></label>
  <label>Video production (£)<input type="number" min="0" step="1" value={videoProduction} onChange={e=>setVideoProduction(e.target.value)}/><small>Camera/video operator, capture setup, cameras/lighting as agreed. Separate from audio recording.</small></label>
  <label>Audio post-production (£)<input type="number" min="0" step="1" value={audioPost} onChange={e=>setAudioPost(e.target.value)}/><small>Audio editing, clean-up, mix, master, episode assembly and exports.</small></label>
  <label>Video post-production (£)<input type="number" min="0" step="1" value={videoPost} onChange={e=>setVideoPost(e.target.value)}/><small>Video edit, multicam assembly, colour grade, titles, exports and agreed revisions.</small></label>
  <div className="quoteSplitPreview"><span>Audio recording <b>{money(audioRecording)}</b></span><span>Video production <b>{money(videoProduction)}</b></span><span>Audio post-production <b>{money(audioPost)}</b></span><span>Video post-production <b>{money(videoPost)}</b></span><span>Total quote <b>{money(total)}</b></span></div>
  <button disabled={busy||deleting}>{busy?'Saving…':'Save project'}</button>{msg&&<small>{msg}</small>}
 </form>
 <div className="projectDangerZone"><button type="button" className="dangerLink" disabled={busy||deleting} onClick={remove}>{deleting?'Deleting…':'Delete project'}</button><small>Deletes the quote/project only. Customers and linked session history are preserved.</small></div></div>;
}

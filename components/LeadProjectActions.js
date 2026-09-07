'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {PODCAST_PRICING} from '../lib/podcastPricing';

function suggestedPounds(hours,video){
 const h=Number(hours||0);if(!h)return '';
 const rate=video?PODCAST_PRICING.videoHourlyPence:(h>=10?PODCAST_PRICING.volumeRecordingHourlyPence:PODCAST_PRICING.audioHourlyPence);
 return String(Math.round(h*rate/100));
}
export default function LeadProjectActions({lead}){
 const router=useRouter();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [hours,setHours]=useState(String(lead.recording_hours||''));
 const [video,setVideo]=useState(String(lead.video_required||'').toLowerCase()==='yes');
 const [recording,setRecording]=useState(()=>suggestedPounds(lead.recording_hours,String(lead.video_required||'').toLowerCase()==='yes'));
 const [recordingTouched,setRecordingTouched]=useState(false);
 const [post,setPost]=useState('');
 const editingRequested=String(lead.editing_required||'').toLowerCase()==='yes';
 useEffect(()=>{if(!recordingTouched)setRecording(suggestedPounds(hours,video))},[hours,video,recordingTouched]);
 const total=Number(recording||0)+Number(post||0);
 async function create(e){
  e.preventDefault();setBusy(true);setMsg('Creating project…');
  const r=await fetch(`/api/admin/leads/${lead.id}/project`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hours:Number(hours||0),recordingPounds:Number(recording||0),postPounds:post===''?0:Number(post||0),video})});
  const j=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not create project.');
  router.push(`/admin/projects/${j.id}`);router.refresh();
 }
 if(lead.project_id)return <a href={`/admin/projects/${lead.project_id}`}>Open project</a>;
 return <div className="leadProjectAction"><button type="button" onClick={()=>setOpen(v=>!v)}>Create quote / project</button>{open&&<form onSubmit={create} className="leadProjectMiniForm">
  <label>Recording hours<input type="number" min="0.5" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} required/></label>
  <label>Recording fee (£)<input type="number" min="1" step="1" value={recording} onChange={e=>{setRecordingTouched(true);setRecording(e.target.value)}} required/><small>{video?'Video recording guide £90/hr':Number(hours)>=10?'Volume recording guide £55/hr':'Audio recording guide £65/hr'} · studio + engineer + raw files</small></label>
  <label>Post-production (£)<input type="number" min="0" step="1" value={post} onChange={e=>setPost(e.target.value)} placeholder={editingRequested?'Leave blank if still TBC':'0'}/><small>{editingRequested?'Editing / mixing / mastering requested — quote separately.':'Only add this if post-production is being sold.'}</small></label>
  <label className="check"><input type="checkbox" checked={video} onChange={e=>setVideo(e.target.checked)}/><span>Video recording / production</span></label>
  <div className="quoteSplitPreview"><span>Recording <b>£{Number(recording||0).toLocaleString('en-GB')}</b></span><span>Post-production <b>{post===''&&editingRequested?'TBC':`£${Number(post||0).toLocaleString('en-GB')}`}</b></span><span>Total currently quoted <b>£{total.toLocaleString('en-GB')}</b></span></div>
  <button disabled={busy}>{busy?'Creating…':'Create project →'}</button>{msg&&<small>{msg}</small>}
 </form>}</div>;
}

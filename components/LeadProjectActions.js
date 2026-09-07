'use client';
import {useEffect,useMemo,useState} from 'react';
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
 useEffect(()=>{if(!recordingTouched)setRecording(suggestedPounds(hours,video))},[hours,video,recordingTouched]);
 const total=useMemo(()=>Math.max(0,Number(recording||0))+Math.max(0,Number(post||0)),[recording,post]);
 async function create(e){
  e.preventDefault();setBusy(true);setMsg('Creating project…');
  const r=await fetch(`/api/admin/leads/${lead.id}/project`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hours:Number(hours||0),recordingPounds:Number(recording||0),postPounds:Number(post||0),video})});
  const j=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not create project.');
  router.push(`/admin/projects/${j.id}`);router.refresh();
 }
 if(lead.project_id)return <a href={`/admin/projects/${lead.project_id}`}>Open project</a>;
 const wantsPost=String(lead.editing_required||'').toLowerCase()==='yes';
 return <div className="leadProjectAction"><button type="button" onClick={()=>setOpen(v=>!v)}>Create quote / project</button>{open&&<form onSubmit={create} className="leadProjectMiniForm"><div className="pricingSplitNotice compact"><b>Keep the quote split.</b><span>Recording = studio + engineer + raw files. Editing / mixing / mastering is a separate post-production charge.</span></div><label>Recording hours<input type="number" min="0.5" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} required/></label><label>Recording fee (£)<input type="number" min="1" step="1" value={recording} onChange={e=>{setRecordingTouched(true);setRecording(e.target.value)}} required/><small>{video?'Video recording guide £90/hr':Number(hours)>=10?'Volume recording guide £55/hr':'Audio recording guide £65/hr'}</small></label><label>Editing / mix / master (£)<input type="number" min="0" step="1" value={post} onChange={e=>setPost(e.target.value)} placeholder={wantsPost?'TBC — quote separately':'0'}/><small>{wantsPost?'Customer asked for post-production — price this separately.':'Leave at £0 if recording files only.'}</small></label><div className="quoteTotalPreview"><small>Project total currently quoted</small><b>£{total.toLocaleString('en-GB')}</b>{wantsPost&&!Number(post)&&<span>+ post-production TBC</span>}</div><label className="check"><input type="checkbox" checked={video} onChange={e=>setVideo(e.target.checked)}/><span>Video recording / production</span></label><button disabled={busy}>{busy?'Creating…':'Create project →'}</button>{msg&&<small>{msg}</small>}</form>}</div>;
}

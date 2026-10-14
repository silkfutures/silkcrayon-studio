'use client';
import {QUOTE_TEMPLATES,templateForLead} from '../lib/quoteTemplates';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {PODCAST_PRICING} from '../lib/podcastPricing';

function suggestedAudioPounds(hours){
 const h=Number(hours||0);if(!h)return '';
 const rate=h>=10?PODCAST_PRICING.volumeRecordingHourlyPence:PODCAST_PRICING.audioHourlyPence;
 return String(Math.round(h*rate/100));
}
function suggestedVideoProductionPounds(hours){
 const h=Number(hours||0);if(!h)return '';
 // Rough production guide only: dedicated camera/video operator + capture setup.
 return String(Math.round(h*50));
}
function money(v){return `£${Number(v||0).toLocaleString('en-GB')}`}
export default function LeadProjectActions({lead}){
 const router=useRouter();const [quoteTemplate,setQuoteTemplate]=useState(templateForLead(lead));
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [hours,setHours]=useState(String(lead.recording_hours||''));
 const requestedVideo=String(lead.video_required||'').toLowerCase()==='yes';
 const editingRequested=String(lead.editing_required||'').toLowerCase()==='yes';
 const [video,setVideo]=useState(requestedVideo);
 const [audioRecording,setAudioRecording]=useState(()=>suggestedAudioPounds(lead.recording_hours));
 const [audioTouched,setAudioTouched]=useState(false);
 const [videoProduction,setVideoProduction]=useState(()=>requestedVideo?suggestedVideoProductionPounds(lead.recording_hours):'');
 const [videoTouched,setVideoTouched]=useState(false);
 const [audioPost,setAudioPost]=useState('');
 const [videoPost,setVideoPost]=useState('');
 useEffect(()=>{if(!audioTouched)setAudioRecording(hours?String(Number(hours)*(quoteTemplate==='podcast'&&Number(hours)>=10?55:QUOTE_TEMPLATES[quoteTemplate].hourly)):'')},[hours,audioTouched,quoteTemplate]);
 useEffect(()=>{if(video&&!videoTouched)setVideoProduction(suggestedVideoProductionPounds(hours));if(!video)setVideoProduction('')},[hours,video,videoTouched]);
 const total=Number(audioRecording||0)+Number(videoProduction||0)+Number(audioPost||0)+Number(videoPost||0);
 async function create(e){
  e.preventDefault();setBusy(true);setMsg('Creating project…');
  const r=await fetch(`/api/admin/leads/${lead.id}/project`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   quoteTemplate,hours:Number(hours||0),audioRecordingPounds:Number(audioRecording||0),videoProductionPounds:video?Number(videoProduction||0):0,
   audioPostPounds:audioPost===''?0:Number(audioPost||0),videoPostPounds:videoPost===''?0:Number(videoPost||0),video
  })});
  const j=await r.json().catch(()=>({}));setBusy(false);
  if(!r.ok)return setMsg(j.error||'Could not create project.');
  router.push(`/admin/projects/${j.id}`);router.refresh();
 }
 if(lead.project_id)return <a href={`/admin/projects/${lead.project_id}`}>Open project</a>;
 return <div className="leadProjectAction"><button type="button" onClick={()=>setOpen(v=>!v)}>Create quote / project</button>{open&&<form onSubmit={create} className="leadProjectMiniForm">
  <label>Quote template<select value={quoteTemplate} onChange={e=>setQuoteTemplate(e.target.value)}>{Object.entries(QUOTE_TEMPLATES).map(([key,t])=><option key={key} value={key}>{t.label}</option>)}</select></label><p>Creates an internal draft. Review and send the customer email from the project page.</p>
  <label>Recording hours<input type="number" min="0.5" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} required/></label>
  <label data-sensitive="financial">{quoteTemplate==='dry_hire'?'Studio hire (£)':'Recording (£)'}<input type="number" min="0" step="1" value={audioRecording} onChange={e=>{setAudioTouched(true);setAudioRecording(e.target.value)}} required/><small data-sensitive="financial">Guide £{quoteTemplate==='podcast'&&Number(hours)>=10?55:QUOTE_TEMPLATES[quoteTemplate].hourly}/hr · {quoteTemplate==='dry_hire'?'studio hire, no engineer':'studio + engineer'}</small></label>
  <label className="check"><input type="checkbox" checked={video} onChange={e=>setVideo(e.target.checked)}/><span>Add video production</span></label>
  {video&&<label data-sensitive="financial">Video production (£)<input type="number" min="0" step="1" value={videoProduction} onChange={e=>{setVideoTouched(true);setVideoProduction(e.target.value)}}/><small data-sensitive="financial">Separate from audio: camera/video operator + capture setup. Rough guide £50/hr; adjust for crew, cameras and lighting.</small></label>}
  <label data-sensitive="financial">Audio post-production (£)<input type="number" min="0" step="1" value={audioPost} onChange={e=>setAudioPost(e.target.value)} placeholder={editingRequested?'Leave blank if TBC':'0'}/><small>Audio edit, clean-up, mix, master, episode assembly and exports.</small></label>
  {video&&<label data-sensitive="financial">Video post-production (£)<input type="number" min="0" step="1" value={videoPost} onChange={e=>setVideoPost(e.target.value)} placeholder="Leave blank if TBC"/><small>Video edit, multicam assembly, colour grade, titles, exports and agreed revisions.</small></label>}
  <div className="quoteSplitPreview"><span>Audio recording <b data-sensitive="financial">{money(audioRecording)}</b></span>{video&&<span>Video production <b data-sensitive="financial">{videoProduction===''?'TBC':money(videoProduction)}</b></span>}<span>Audio post-production <b data-sensitive="financial">{audioPost===''&&editingRequested?'TBC':money(audioPost)}</b></span>{video&&<span>Video post-production <b data-sensitive="financial">{videoPost===''?'TBC':money(videoPost)}</b></span>}<span>Total currently quoted <b data-sensitive="financial">{money(total)}</b></span></div>
  <small>Only priced line items are included in the total. Any TBC post-production remains outside the quote until agreed.</small>
  <button disabled={busy}>{busy?'Creating…':'Create project →'}</button>{msg&&<small>{msg}</small>}
 </form>}</div>;
}

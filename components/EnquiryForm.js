'use client';
import {useState} from 'react';

const configs={
 mixing:{title:'Mixing & Studio Finish',intro:'Tell us where the record is at and what you want it to become.'},
 'podcast-recording':{title:'Podcast Recording',intro:'Tell us the format, scale and dates. Recording and post-production are quoted separately so you only pay for what you need.'},
 'audiobook-voiceover':{title:'Audiobooks & Voiceover',intro:'Tell us about the spoken-word project and we’ll recommend the right setup.'},
 'audiobook-podcast':{title:'Podcasts & Spoken Word',intro:'Tell us about the project and we’ll recommend the right setup.'},
 'bespoke-production':{title:'Bespoke Production',intro:'Give us the brief. We’ll work out the best route from idea to finished production.'},
 'call-request':{title:'Request a call',intro:'Not sure what you need? Tell us a little about the project and we’ll give you a call.'},
 general:{title:'Tell us about your project',intro:'Give us the brief and we’ll point you toward the right service.'}
};

export default function EnquiryForm({type}){
 const c=configs[type]||configs.general;const [state,setState]=useState('idle');const [started]=useState(()=>Date.now());
 async function submit(e){e.preventDefault();setState('sending');const f=Object.fromEntries(new FormData(e.currentTarget));f.enquiry_type=type;f.recurring_project=f.recurring_project==='on';const r=await fetch('/api/enquiries',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(f)});setState(r.ok?'done':'error')}
 if(state==='done')return <div className="enquirySuccess"><p className="eyebrow">Enquiry received</p><h2>We’ve got your project.</h2><p>Silkcrayon will review what you’ve sent and get back to you shortly.</p><a href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer">See what’s happening at @silkcrayon ↗</a></div>;
 const podcast=type==='podcast-recording'||type==='audiobook-podcast';const spoken=type==='audiobook-voiceover'||type==='audiobook-podcast';
 return <form className="enquiryForm" onSubmit={submit}>
  <input className="formTrap" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true"/><input type="hidden" name="form_started_at" value={started}/>
  <div><p className="eyebrow">Enquire</p><h1>{c.title}</h1><p>{c.intro}</p></div>
  {podcast&&<div className="pricingSplitNotice"><b>Recording and post-production are separate.</b><span>Your recording quote covers booked studio time, a recording engineer and organised raw audio. Editing, mixing, mastering, episode assembly and video editing are additional and quoted separately.</span></div>}
  <div className="enquiryGrid">
   <label>Your name*<input name="full_name" required/></label><label>Artist / company name<input name="artist_or_company"/></label><label>Email*<input name="email" type="email" required/></label><label>Mobile<input name="phone" type="tel"/></label>
   {type==='call-request'&&<label>Best time to call<select name="preferred_call_time"><option value="">No preference</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>}
   {podcast&&<><label>Project type<select name="project_type" defaultValue="Podcast"><option>Podcast</option>{spoken&&<><option>Audiobook</option><option>Voiceover</option><option>Other spoken word</option></>}</select></label><label>Number of speakers<input name="speakers" type="number" min="1" step="1"/></label><label>Number of episodes<input name="episode_count" type="number" min="1" step="1"/></label><label>Approx. episode length (minutes)<input name="episode_length_minutes" type="number" min="1" step="1"/></label><label>Estimated recording hours<input name="recording_hours" type="number" min="0.5" step="0.5"/></label><label>Video required?<select name="video_required"><option>Not sure</option><option>Yes</option><option>No</option></select></label><label>Post-production needed?<select name="editing_required"><option>Not sure</option><option value="Yes">Yes — editing / mixing / mastering</option><option value="No">No — recording files only</option></select><small>Charged separately from the recording session.</small></label><label>Target recording dates<input name="target_dates" placeholder="e.g. late September + late October"/></label><label className="check"><input type="checkbox" name="recurring_project"/><span>Likely to be an ongoing / recurring project</span></label></>}
   {type==='audiobook-voiceover'&&<><label>Project type<select name="project_type"><option>Audiobook</option><option>Voiceover</option><option>Other spoken word</option></select></label><label>Approx. word count / runtime<input name="word_count_runtime"/></label><label>Number of speakers<input name="speakers" type="number" min="1" step="1"/></label><label>Post-production needed?<select name="editing_required"><option>Not sure</option><option value="Yes">Yes — editing / mixing / mastering</option><option value="No">No — recording files only</option></select><small>Charged separately from the recording session.</small></label></>}
   {type==='mixing'&&<><label>Number of tracks<input name="track_count"/></label><label>Stems ready?<select name="stems_available"><option>Yes</option><option>No</option><option>Not sure</option></select></label><label>Reference tracks<input name="reference_tracks" placeholder="Artist / song names or links"/></label></>}
   {type==='bespoke-production'&&<><label>Genre / style<input name="project_type"/></label><label>Budget range<input name="budget_range"/></label></>}
   {type!=='call-request'&&!podcast&&<label>Desired deadline<input name="deadline"/></label>}
   <label className="wide">What do you need help with?*<textarea name="project_details" required rows="6" placeholder="Tell us where the project is now and what you want to leave with."/></label>
  </div>
  <button className="button primary" disabled={state==='sending'}>{state==='sending'?'Sending…':'Send enquiry →'}</button>{state==='error'&&<p className="formError">Something went wrong. Please try again.</p>}
 </form>
}

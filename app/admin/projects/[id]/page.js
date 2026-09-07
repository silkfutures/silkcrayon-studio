import Link from 'next/link';import {notFound} from 'next/navigation';import {requireOwner} from '../../../../lib/auth';import {getAdminDb} from '../../../../lib/supabase';import AdminNav from '../../../../components/AdminNav';import ProjectControls from '../../../../components/ProjectControls';import {formatUkDate} from '../../../../lib/dates';
export const dynamic='force-dynamic';
function money(p){return `£${(Number(p||0)/100).toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:2})}`}
export default async function ProjectPage({params}){
 const ctx=await requireOwner();const {id}=await params;const db=getAdminDb();
 const [{data:p},{data:sessions=[]}]=await Promise.all([
  db.from('studio_projects').select('*').eq('id',id).maybeSingle(),
  db.from('bookings').select('id,booking_date,start_time,end_time,duration_minutes,status,payment_status,service_name,amount_pence').eq('project_id',id).order('booking_date').order('start_time')
 ]);
 if(!p)notFound();
 const included=Number(p.recording_hours_included||0),used=Number(p.recording_hours_used||0),remaining=Math.max(0,included-used);
 const hasBreakdown=['audio_recording_amount_pence','video_production_amount_pence','audio_post_amount_pence','video_post_amount_pence'].some(k=>Number(p[k]||0)>0);
 const audioRecording=hasBreakdown?Number(p.audio_recording_amount_pence||0):Number(p.recording_amount_pence||0);
 const videoProduction=Number(p.video_production_amount_pence||0);
 const audioPost=hasBreakdown?Number(p.audio_post_amount_pence||0):Number(p.post_amount_pence||0);
 const videoPost=Number(p.video_post_amount_pence||0);
 const total=audioRecording+videoProduction+audioPost+videoPost;
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Project</p><h1>{p.title}</h1><p className="muted">{p.contact_name} · <a href={`mailto:${p.email}`}>{p.email}</a>{p.phone?<> · <a href={`tel:${p.phone}`}>{p.phone}</a></>:null}</p></div><AdminNav profile={ctx.profile}/></header>
 <section className="adminSection projectSummary"><div><small>Audio recording</small><b>{money(audioRecording)}</b></div><div><small>Video production</small><b>{videoProduction?money(videoProduction):'Not included'}</b></div><div><small>Audio post</small><b>{p.editing_required&&audioPost===0?'TBC':audioPost?money(audioPost):'Not included'}</b></div><div><small>Video post</small><b>{p.video_required&&videoPost===0?'TBC':videoPost?money(videoPost):'Not included'}</b></div><div><small>Total quoted</small><b>{money(total)}</b></div><div><small>Recording allowance</small><b>{included}h</b></div><div><small>Used</small><b>{used}h</b></div><div><small>Remaining</small><b>{remaining}h</b></div></section>
 <section className="adminSection quoteScopeNotice"><p className="eyebrow">Commercial scope</p><h2>Every production stage is priced separately.</h2><p><b>Audio recording</b> covers studio time, the audio engineer and organised raw audio. <b>Video production</b> covers camera/video crew and capture setup. <b>Audio post-production</b> covers edit, clean-up, mix/master and episode exports. <b>Video post-production</b> covers edit, multicam assembly, colour grade, titles and exports. Only priced line items are included in the quote.</p></section>
 <section className="adminSection"><div className="projectBrief"><h2>Production brief</h2>{p.episode_count&&<p><b>Episodes:</b> {p.episode_count}{p.episode_length_minutes?` × ~${p.episode_length_minutes} minutes`:''}</p>}{p.speaker_count&&<p><b>Speakers:</b> {p.speaker_count}</p>}<p><b>Video:</b> {p.video_required?'Yes':'No'} · <b>Post-production requested:</b> {p.editing_required===null?'TBC':p.editing_required?'Yes':'No'}</p>{p.target_dates&&<p><b>Target dates:</b> {p.target_dates}</p>}{p.notes&&<p className="leadDetails">{p.notes}</p>}</div><ProjectControls project={p} linkedSessionCount={sessions.length}/></section>
 <section className="adminSection projectSessions"><div className="adminSectionHead"><div><p className="eyebrow">Recording schedule</p><h2>Sessions in this project</h2><p className="muted">Completed linked sessions automatically reduce the recording-hours allowance using the actual hours logged in the session report.</p></div><Link className="button primary" href={`/admin/bookings/new?project=${p.id}`}>+ Add project session</Link></div>
 {sessions.length?<div className="tableWrap"><table><thead><tr><th>Date</th><th>Time</th><th>Booked</th><th>Status</th><th>Project billing</th><th></th></tr></thead><tbody>{sessions.map(s=><tr key={s.id}><td>{formatUkDate(s.booking_date)}</td><td>{String(s.start_time).slice(0,5)}–{String(s.end_time).slice(0,5)}</td><td>{Number(s.duration_minutes||0)/60}h</td><td>{s.status}</td><td>Included in project quote</td><td><Link href={`/admin/engineer/session/${s.id}`}>Open →</Link></td></tr>)}</tbody></table></div>:<div className="emptyState"><b>No sessions linked yet.</b><p>Add the first recording date when the quote is accepted.</p></div>}
 </section></main>
}

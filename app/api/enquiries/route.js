import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/supabase';
import {ownerEmails,sendEmail} from '../../../lib/notifications';
import {rateLimit} from '../../../lib/rateLimit';
import {looksLikeObviousSpam} from '../../../lib/leadSpam';

function e(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export async function POST(req){
 try{
  const body=await req.json();
  const started=Number(body.form_started_at||0),elapsed=Date.now()-started;
  if(String(body.website||'').trim()||!started||elapsed<1800||elapsed>7200000||looksLikeObviousSpam(body))return NextResponse.json({ok:true});
  const ipOk=await rateLimit(req,{scope:'enquiry-ip',limit:20,windowSeconds:3600});
  const emailOk=await rateLimit(req,{scope:'enquiry-email',limit:4,windowSeconds:3600,identity:body.email||''});
  if(!ipOk||!emailOk)return NextResponse.json({error:'Too many enquiries from this connection. Please try again later.'},{status:429});
  if(!body.full_name||!body.email||!body.enquiry_type)return NextResponse.json({error:'Please complete the required fields.'},{status:400});
  if(String(body.full_name||'').length>120||String(body.email||'').length>254||String(body.project_details||'').length>4000)return NextResponse.json({error:'Some enquiry details are too long.'},{status:400});
  const allowed=['mixing','podcast-recording','audiobook-voiceover','audiobook-podcast','bespoke-production','call-request','general'];
  const enquiry_type=allowed.includes(body.enquiry_type)?body.enquiry_type:'general';
  const row={enquiry_type,client_type:body.client_type||'client',full_name:String(body.full_name).trim(),artist_or_company:body.artist_or_company||null,email:String(body.email).trim().toLowerCase(),phone:body.phone||null,preferred_call_time:body.preferred_call_time||null,project_type:body.project_type||null,project_details:body.project_details||null,budget_range:body.budget_range||null,deadline:body.deadline||null,word_count_runtime:body.word_count_runtime||null,speakers:body.speakers||null,editing_required:body.editing_required||null,track_count:body.track_count||null,stems_available:body.stems_available||null,reference_tracks:body.reference_tracks||null,episode_count:body.episode_count?Number(body.episode_count):null,episode_length_minutes:body.episode_length_minutes?Number(body.episode_length_minutes):null,recording_hours:body.recording_hours?Number(body.recording_hours):null,video_required:body.video_required||null,target_dates:body.target_dates||null,recurring_project:Boolean(body.recurring_project),source:'website'};
  const db=getAdminDb();
  const {data,error}=await db.from('leads').insert(row).select('id').single();if(error)throw error;
  await db.from('crm_contacts').upsert({full_name:row.full_name,email:row.email,phone:row.phone,company:row.artist_or_company||null,source:'Website enquiry',marketing_status:'unknown',marketing_consent:false,updated_at:new Date().toISOString()},{onConflict:'email'});
  const owners=await ownerEmails();
  const subject=`New ${enquiry_type==='call-request'?'call request':enquiry_type==='podcast-recording'?'podcast enquiry':'website enquiry'} — ${row.full_name}`;
  const html=`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto;border:1px solid #3d3150;padding:28px"><div style="color:#C394FF;letter-spacing:3px;font-size:11px">ACTION REQUIRED</div><h1>${e(enquiry_type==='call-request'?'New call request.':'New enquiry.')}</h1><p><b>${e(row.full_name)}</b><br>${e(row.email)}<br>${e(row.phone||'No phone supplied')}</p><p><b>Type:</b> ${e(enquiry_type)}<br><b>Preferred call time:</b> ${e(row.preferred_call_time||'—')}<br><b>Project:</b> ${e(row.project_details||row.project_type||'—')}${row.episode_count?`<br><b>Episodes:</b> ${e(row.episode_count)}${row.episode_length_minutes?` × ~${e(row.episode_length_minutes)} min`:''}`:''}${row.recording_hours?`<br><b>Estimated recording:</b> ${e(row.recording_hours)} hours`:''}${row.speakers?`<br><b>Speakers:</b> ${e(row.speakers)}`:''}${row.video_required?`<br><b>Video:</b> ${e(row.video_required)}`:''}${row.editing_required?`<br><b>Editing:</b> ${e(row.editing_required)}`:''}</p><p><a style="color:#C394FF;font-weight:bold" href="${process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon-studio.vercel.app'}/admin">Open Silkcrayon OS →</a></p></div></div>`;
  for(const email of owners){const sent=await sendEmail({to:email,subject,html});if(!sent.ok)console.error('Owner enquiry email failed',sent.error)}
  return NextResponse.json({ok:true,id:data.id});
 }catch(err){console.error(err);return NextResponse.json({error:'We could not send your enquiry. Please try again.'},{status:500})}
}

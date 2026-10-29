import {QUOTE_TEMPLATES} from '../../../../../lib/quoteTemplates';
import {NextResponse} from 'next/server';import {requireOwner} from '../../../../../lib/auth';import {getAdminDb} from '../../../../../lib/supabase';
const allowed=new Set(['quoted','accepted','deposit_due','scheduled','recording','post_production','delivered','lost']);
function pence(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.round(n*100)):null}
export async function PATCH(req,{params}){try{
 await requireOwner();const {id}=await params,b=await req.json(),db=getAdminDb();const patch={updated_at:new Date().toISOString()};
 if(allowed.has(b.status))patch.status=b.status;
 if(b.quote){if(!QUOTE_TEMPLATES[b.quote.quote_template])return NextResponse.json({error:'Choose a quote template.'},{status:400});patch.project_type=QUOTE_TEMPLATES[b.quote.quote_template].type;for(const key of ['quote_template','quote_scope','quote_handover','quote_exclusions','quote_turnaround']){const value=String(b.quote[key]||'').trim();if(!value||value.length>3000)return NextResponse.json({error:'Complete the quote fields (maximum 3,000 characters each).'},{status:400});patch[key]=value;}}
 const audioRecording=pence(b.audioRecordingPounds),videoProduction=pence(b.videoProductionPounds),audioPost=pence(b.audioPostPounds),videoPost=pence(b.videoPostPounds);
 const hasNew=[audioRecording,videoProduction,audioPost,videoPost].some(v=>v!==null);
 if(hasNew){
  const {data:current,error:ce}=await db.from('studio_projects').select('audio_recording_amount_pence,video_production_amount_pence,audio_post_amount_pence,video_post_amount_pence').eq('id',id).single();if(ce)throw ce;
  const ar=audioRecording??Number(current.audio_recording_amount_pence||0),vp=videoProduction??Number(current.video_production_amount_pence||0),ap=audioPost??Number(current.audio_post_amount_pence||0),vpost=videoPost??Number(current.video_post_amount_pence||0);
  Object.assign(patch,{audio_recording_amount_pence:ar,video_production_amount_pence:vp,audio_post_amount_pence:ap,video_post_amount_pence:vpost,recording_amount_pence:ar+vp,post_amount_pence:ap+vpost,quote_amount_pence:ar+vp+ap+vpost,video_required:vp>0||vpost>0});
 }else{
  // Backwards-compatible payload support.
  const recording=pence(b.recordingPounds),post=pence(b.postPounds);
  if(recording!==null||post!==null){const {data:current,error:ce}=await db.from('studio_projects').select('recording_amount_pence,post_amount_pence').eq('id',id).single();if(ce)throw ce;const r=recording??Number(current.recording_amount_pence||0),p=post??Number(current.post_amount_pence||0);Object.assign(patch,{recording_amount_pence:r,post_amount_pence:p,quote_amount_pence:r+p});}
 }
 const {error}=await db.from('studio_projects').update(patch).eq('id',id);if(error)throw error;
 // Keep the originating enquiry's pipeline in step with the project.
 if(patch.status){const leadStatus=patch.status==='lost'?'lost':patch.status==='quoted'?'quote_sent':'confirmed';
  const {data:project}=await db.from('studio_projects').select('lead_id').eq('id',id).maybeSingle();
  if(project?.lead_id)await db.from('leads').update({status:leadStatus,updated_at:new Date().toISOString()}).eq('id',project.lead_id);}
 return NextResponse.json({ok:true});
}catch(e){return NextResponse.json({error:e.message||'Could not update project.'},{status:500})}}

export async function DELETE(req,{params}){try{
 await requireOwner();const {id}=await params,db=getAdminDb();
 // bookings.project_id is ON DELETE SET NULL, so session/customer/accounting history is retained.
 const {error}=await db.from('studio_projects').delete().eq('id',id);if(error)throw error;
 return NextResponse.json({ok:true});
}catch(e){return NextResponse.json({error:e.message||'Could not delete project.'},{status:500})}}

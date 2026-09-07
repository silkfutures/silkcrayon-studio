import {NextResponse} from 'next/server';
import {requireOwner} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';

function yes(v){return ['yes','true','1','required'].includes(String(v||'').toLowerCase())}
export async function POST(req,{params}){try{
 await requireOwner();const {id}=await params;const b=await req.json();const db=getAdminDb();
 const {data:lead,error}=await db.from('leads').select('*').eq('id',id).single();if(error||!lead)return NextResponse.json({error:'Enquiry not found.'},{status:404});
 const {data:existing}=await db.from('studio_projects').select('id').eq('lead_id',id).maybeSingle();if(existing)return NextResponse.json({ok:true,id:existing.id});
 const hours=Math.max(0,Number(b.hours||lead.recording_hours||0));
 const recordingPence=Math.round(Number(b.recordingPounds??b.quotePounds??0)*100),postPence=Math.max(0,Math.round(Number(b.postPounds||0)*100));
 if(!hours||!recordingPence)return NextResponse.json({error:'Recording hours and recording fee are required.'},{status:400});
 let customerId=null;
 if(lead.email){
  const {data:customer}=await db.from('customers').select('id').eq('email',String(lead.email).trim().toLowerCase()).maybeSingle();
  if(customer)customerId=customer.id;
  else{
   const {data:created,error:ce}=await db.from('customers').insert({full_name:lead.full_name||lead.artist_or_company||'Podcast client',email:String(lead.email).trim().toLowerCase(),phone:lead.phone||null,artist_name:lead.artist_or_company||null}).select('id').single();
   if(!ce)customerId=created.id;
  }
 }
 const episodeCount=Number(lead.episode_count||0)||null,episodeLength=Number(lead.episode_length_minutes||0)||null,speakers=Number(lead.speakers||0)||null;
 const editing=String(lead.editing_required||'').toLowerCase();
 const {data:project,error:pe}=await db.from('studio_projects').insert({
  lead_id:id,customer_id:customerId,title:lead.artist_or_company?`${lead.artist_or_company} — ${lead.project_type||'Podcast'}`:`${lead.full_name} — ${lead.project_type||'Podcast'}`,
  project_type:lead.enquiry_type==='audiobook-voiceover'?'spoken-word':'podcast',status:'quoted',contact_name:lead.full_name,company_name:lead.artist_or_company||null,email:lead.email,phone:lead.phone||null,
  speaker_count:speakers,episode_count:episodeCount,episode_length_minutes:episodeLength,recording_hours_included:hours,video_required:Boolean(b.video)||yes(lead.video_required),editing_required:editing==='yes'?true:editing==='no'?false:null,
  quote_amount_pence:recordingPence+postPence,recording_amount_pence:recordingPence,post_amount_pence:postPence,target_dates:lead.target_dates||lead.deadline||null,notes:lead.project_details||null
 }).select('id').single();if(pe)throw pe;
 await db.from('leads').update({status:'interested',updated_at:new Date().toISOString()}).eq('id',id);
 return NextResponse.json({ok:true,id:project.id});
}catch(e){return NextResponse.json({error:e.message||'Could not create project.'},{status:500})}}

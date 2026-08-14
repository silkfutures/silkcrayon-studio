import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/supabase';
import {ownerEmails,sendEmail} from '../../../lib/notifications';
import {rateLimit} from '../../../lib/rateLimit';

function e(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export async function POST(req){
 try{
  const body=await req.json();if(!await rateLimit(req,{scope:'enquiry',limit:8,windowSeconds:3600,identity:body.email||''}))return NextResponse.json({error:'Too many enquiries from this connection. Please try again later.'},{status:429});
  if(!body.full_name||!body.email||!body.enquiry_type)return NextResponse.json({error:'Please complete the required fields.'},{status:400});
  if(String(body.full_name||'').length>120||String(body.email||'').length>254||String(body.project_details||'').length>4000)return NextResponse.json({error:'Some enquiry details are too long.'},{status:400});
  const allowed=['mixing','audiobook-podcast','bespoke-production','call-request','general'];
  const enquiry_type=allowed.includes(body.enquiry_type)?body.enquiry_type:'general';
  const row={enquiry_type,client_type:body.client_type||'client',full_name:String(body.full_name).trim(),artist_or_company:body.artist_or_company||null,email:String(body.email).trim().toLowerCase(),phone:body.phone||null,preferred_call_time:body.preferred_call_time||null,project_type:body.project_type||null,project_details:body.project_details||null,budget_range:body.budget_range||null,deadline:body.deadline||null,word_count_runtime:body.word_count_runtime||null,speakers:body.speakers||null,editing_required:body.editing_required||null,track_count:body.track_count||null,stems_available:body.stems_available||null,reference_tracks:body.reference_tracks||null,source:'website'};
  const db=getAdminDb();
  const {data,error}=await db.from('leads').insert(row).select('id').single();if(error)throw error;
  await db.from('crm_contacts').upsert({full_name:row.full_name,email:row.email,phone:row.phone,company:row.artist_or_company||null,source:'Website enquiry',marketing_status:'unknown',marketing_consent:false,updated_at:new Date().toISOString()},{onConflict:'email'});
  const owners=await ownerEmails();
  const subject=`New ${enquiry_type==='call-request'?'call request':'website enquiry'} — ${row.full_name}`;
  const html=`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto;border:1px solid #3d3150;padding:28px"><div style="color:#C394FF;letter-spacing:3px;font-size:11px">ACTION REQUIRED</div><h1>${e(enquiry_type==='call-request'?'New call request.':'New enquiry.')}</h1><p><b>${e(row.full_name)}</b><br>${e(row.email)}<br>${e(row.phone||'No phone supplied')}</p><p><b>Type:</b> ${e(enquiry_type)}<br><b>Preferred call time:</b> ${e(row.preferred_call_time||'—')}<br><b>Project:</b> ${e(row.project_details||row.project_type||'—')}</p><p><a style="color:#C394FF;font-weight:bold" href="${process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon-studio.vercel.app'}/admin">Open Silkcrayon OS →</a></p></div></div>`;
  for(const email of owners){const sent=await sendEmail({to:email,subject,html});if(!sent.ok)console.error('Owner enquiry email failed',sent.error)}
  return NextResponse.json({ok:true,id:data.id});
 }catch(err){console.error(err);return NextResponse.json({error:'We could not send your enquiry. Please try again.'},{status:500})}
}

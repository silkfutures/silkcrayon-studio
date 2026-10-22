import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {sendEmail,staffEmail} from '../../../../../../lib/notifications';
const bucket='session-deliveries';
export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();if(ctx?.profile?.role!=='owner')return NextResponse.json({error:'Owner only'},{status:403});
  const {id}=await params;const db=getAdminDb();const b=await req.json();
  const {data:job,error:je}=await db.from('mix_jobs').select('id,track_title,status,engineer_user_id').eq('id',id).single();if(je||!job)return NextResponse.json({error:'Mix not found'},{status:404});
  if(['approved','delivered'].includes(job.status))return NextResponse.json({error:'Mix is already completed'},{status:409});
  const fee=Number(b.feePence);if(!Number.isSafeInteger(fee)||fee<0)return NextResponse.json({error:'Invalid engineer fee'},{status:400});
  const {data:eng}=await db.from('staff_profiles').select('user_id,engineer_name,full_name').eq('user_id',b.engineerUserId).eq('role','engineer').eq('active',true).maybeSingle();
  if(!eng)return NextResponse.json({error:'Choose an active engineer'},{status:400});
  const {data:existing}=await db.from('mix_engineer_offers').select('id').eq('mix_job_id',id).eq('status','pending').maybeSingle();if(existing)return NextResponse.json({error:'A pending offer already exists. Cancel it before sending another.'},{status:409});
  if(b.mode==='prepare'){
   const ext=String(b.fileName||'').split('.').pop().toLowerCase();if(!['mp3','wav','m4a','aac','flac','aiff','aif'].includes(ext))return NextResponse.json({error:'Upload an audio demo'},{status:400});
   const path=`mix-offer-demos/${id}/${crypto.randomUUID()}.${ext}`;
   const {data,error}=await db.storage.from(bucket).createSignedUploadUrl(path);if(error)throw error;
   return NextResponse.json({bucket,path,token:data.token});
  }
  let demoPath=null;const path=String(b.demoPath||'');
  if(path){if(!path.startsWith(`mix-offer-demos/${id}/`)||path.includes('..'))return NextResponse.json({error:'Invalid demo path'},{status:400});const {data:files,error:le}=await db.storage.from(bucket).list(`mix-offer-demos/${id}`,{limit:100});if(le)throw le;if(!files?.some(f=>path.endsWith('/'+f.name)))return NextResponse.json({error:'Demo upload has not completed'},{status:400});demoPath=path;}
  const {data:offer,error}=await db.from('mix_engineer_offers').insert({mix_job_id:id,engineer_user_id:eng.user_id,fee_pence:fee,demo_path:demoPath,demo_name:demoPath?String(b.demoName||'Demo audio').slice(0,200):null,notes:String(b.notes||'').slice(0,3000),status:'pending'}).select('id').single();if(error)throw error;
  const to=await staffEmail(eng.user_id);let warning=null;
  if(to){const link=`${process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon.com'}/admin/engineer/mixes/${id}`;const msg=await sendEmail({to,source:'mix_engineer_offer',subject:`New mix offer — ${job.track_title}`,html:`<div style="font-family:Arial;background:#0d0914;color:white;padding:32px"><h1>New mix offer</h1><p>${escapeHtml(job.track_title)}</p><p>Proposed fee: £${(fee/100).toFixed(2)}</p><p>Log into your engineer OS to listen to the demo and accept or decline.</p><a style="color:#c394ff" href="${link}">Review offer →</a></div>`});if(!msg.ok)warning='Offer saved but email delivery failed';}else warning='Offer saved; engineer email was not found';
  return NextResponse.json({ok:true,id:offer.id,warning});
 }catch(e){return NextResponse.json({error:e.message},{status:500})}
}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

export async function DELETE(req,{params}){try{const ctx=await getStaffContext();if(ctx?.profile?.role!=='owner')return NextResponse.json({error:'Owner only'},{status:403});const {id}=await params;const db=getAdminDb();const {error}=await db.from('mix_engineer_offers').update({status:'cancelled',responded_at:new Date().toISOString()}).eq('mix_job_id',id).eq('status','pending');if(error)throw error;return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e.message},{status:500})}}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../../lib/supabase';
import {sendEmail,ownerEmails} from '../../../../../../../lib/notifications';
export async function POST(req,{params}){try{
 const ctx=await getStaffContext();if(!ctx)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;const db=getAdminDb(),b=await req.json();if(!['accepted','declined'].includes(b.decision))return NextResponse.json({error:'Invalid decision'},{status:400});
 const {data:o}=await db.from('mix_engineer_offers').select('*').eq('mix_job_id',id).eq('status','pending').maybeSingle();if(!o)return NextResponse.json({error:'Offer no longer pending'},{status:409});
 if(ctx.profile.role!=='owner'&&ctx.user.id!==o.engineer_user_id)return NextResponse.json({error:'Not your offer'},{status:403});
 // Conditional update ensures a repeated click cannot accept twice.
 const {data:updated,error}=await db.from('mix_engineer_offers').update({status:b.decision,responded_at:new Date().toISOString()}).eq('id',o.id).eq('status','pending').select('id').maybeSingle();if(error)throw error;if(!updated)return NextResponse.json({error:'Offer already processed'},{status:409});
 if(b.decision==='accepted'){
  const {data:job}=await db.from('mix_jobs').select('engineer_user_id,status').eq('id',id).single();
  if(job.engineer_user_id&&job.engineer_user_id!==o.engineer_user_id){await db.from('mix_engineer_offers').update({status:'cancelled'}).eq('id',o.id);return NextResponse.json({error:'Job was already assigned to another engineer. Contact the owner.'},{status:409});}
  if(['approved','delivered'].includes(job.status))return NextResponse.json({error:'Job already completed'},{status:409});
  const {error:ue}=await db.from('mix_jobs').update({engineer_user_id:o.engineer_user_id,engineer_fee_pence:o.fee_pence,updated_at:new Date().toISOString()}).eq('id',id);if(ue)throw ue;
 }
 const {data:job}=await db.from('mix_jobs').select('track_title').eq('id',id).single();
 for(const to of await ownerEmails()){await sendEmail({to,source:'mix_offer_response',subject:`Mix offer ${b.decision} — ${job?.track_title||'Mix'}`,html:`<p>The engineer ${b.decision} the mix offer.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon.com'}/admin/mixes/${id}">Open mix →</a></p>`});}
 return NextResponse.json({ok:true,decision:b.decision});
}catch(e){return NextResponse.json({error:e.message},{status:500})}}

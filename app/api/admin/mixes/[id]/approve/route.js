import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';

export async function POST(_request,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params;
  const db=getAdminDb();
  const {data:job,error}=await db.from('mix_jobs').select('id,status,quoted_amount_pence,paid_amount_pence').eq('id',id).single();
  if(error||!job)return NextResponse.json({error:'Mix job not found.'},{status:404});
  if(['approved','delivered'].includes(job.status))return NextResponse.json({ok:true,alreadyApproved:true});
  if(!['first_mix_sent','revisions'].includes(job.status))return NextResponse.json({error:'Send a mix version for review before marking it approved.'},{status:409});
  if(Number(job.paid_amount_pence||0)<Number(job.quoted_amount_pence||0))return NextResponse.json({error:'The mix still has an outstanding balance.'},{status:409});
  const now=new Date().toISOString();
  const {error:updateError}=await db.from('mix_jobs').update({status:'approved',updated_at:now}).eq('id',id);
  if(updateError)throw updateError;
  await db.from('mix_tracks').update({status:'approved'}).eq('mix_job_id',id);
  await db.from('mix_activity').insert({mix_job_id:id,event_type:'approved_by_studio',channel:'internal',status:'recorded',detail:'Mix marked approved in Studio OS after customer approval was confirmed outside the review link.',created_by_user_id:ctx.user.id});
  return NextResponse.json({ok:true,status:'approved'});
 }catch(error){return NextResponse.json({error:error.message||'Could not approve mix.'},{status:500})}
}

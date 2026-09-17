import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {ownerEmails,sendEmail} from '../../../../lib/notifications';

const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const baseUrl=request=>String(process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin).replace(/\/$/,'');

async function loadReview(db,token){
  const {data:delivery}=await db.from('session_deliveries').select('id,mix_job_id,share_token,created_at,customer_id').eq('share_token',token).maybeSingle();
  if(!delivery?.mix_job_id)return {error:'This is not a mix review link.',status:404};
  const [{data:job},{data:latest},{count:revisionCount},{data:latestRevision}]=await Promise.all([
    db.from('mix_jobs').select('*,customers(id,full_name,artist_name,email)').eq('id',delivery.mix_job_id).maybeSingle(),
    db.from('session_deliveries').select('id,share_token,created_at').eq('mix_job_id',delivery.mix_job_id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    db.from('mix_revisions').select('id',{count:'exact',head:true}).eq('mix_job_id',delivery.mix_job_id),
    db.from('mix_revisions').select('id,created_at').eq('mix_job_id',delivery.mix_job_id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  if(!job)return {error:'Mix job not found.',status:404};
  if(latest?.share_token!==token)return {error:'A newer mix version has been sent. Please use the latest review link.',status:409};
  const revisionPending=Boolean(latestRevision?.created_at&&latest?.created_at&&new Date(latestRevision.created_at).getTime()>new Date(latest.created_at).getTime());
  return {delivery,job,revisionCount:Number(revisionCount||0),revisionPending};
}

async function notifyOwners({request,job,customer,action,notes=''}){
  const artist=customer?.artist_name||customer?.full_name||'Customer';
  const title=job.track_title||'Mix';
  const root=baseUrl(request),href=`${root}/admin/mixes/${job.id}`;
  const approved=action==='approve';
  const subject=approved?`Mix approved ✓ — ${title} · ${artist}`:`Revision requested — ${title} · ${artist}`;
  const detail=approved
    ? `<p style="font-size:18px"><b>${escapeHtml(artist)}</b> approved <b>${escapeHtml(title)}</b>.</p><p>No further client changes are requested on this version.</p>`
    : `<p><b>${escapeHtml(artist)}</b> requested changes to <b>${escapeHtml(title)}</b>.</p><div style="margin:18px 0;padding:16px;border-left:3px solid #c394ff;background:#110c16;white-space:pre-wrap">${escapeHtml(notes)}</div>`;
  const html=`<div style="font-family:Arial,sans-serif;background:#070608;color:#fff;padding:28px"><div style="max-width:620px;margin:auto;border:1px solid #3a3043;padding:28px"><div style="color:#c394ff;letter-spacing:3px;font-size:11px">SILKCRAYON OS</div><h1>${approved?'Mix approved.':'Revision requested.'}</h1>${detail}<p><a href="${href}" style="display:inline-block;background:#c394ff;color:#0d0911;padding:14px 18px;text-decoration:none;font-weight:900">OPEN MIX JOB →</a></p></div></div>`;
  for(const email of await ownerEmails())await sendEmail({to:email,subject,html});
}

export async function POST(request,{params}){
  try{
    const {token}=await params,body=await request.json(),db=getAdminDb();
    const loaded=await loadReview(db,token);
    if(loaded.error)return NextResponse.json({error:loaded.error},{status:loaded.status});
    const {job,revisionCount,revisionPending}=loaded;
    if(revisionPending)return NextResponse.json({error:'Your revision request has already been sent for this version. The studio will send a new review link when the next version is ready.'},{status:409});
    if(!['first_mix_sent','revisions'].includes(job.status)){
      if(job.status==='approved'||job.status==='delivered')return NextResponse.json({ok:true,status:job.status,alreadyComplete:true});
      return NextResponse.json({error:'This mix is not currently awaiting client review.'},{status:409});
    }

    if(body.action==='approve'){
      const now=new Date().toISOString();
      const {error:updateError}=await db.from('mix_jobs').update({status:'approved',updated_at:now}).eq('id',job.id);
      if(updateError)throw updateError;
      await db.from('mix_tracks').update({status:'approved'}).eq('mix_job_id',job.id);
      await db.from('mix_activity').insert({mix_job_id:job.id,event_type:'client_approved',channel:'review_link',status:'recorded',detail:'Client approved the latest mix version.'});
      await notifyOwners({request,job,customer:job.customers,action:'approve'});
      return NextResponse.json({ok:true,status:'approved'});
    }

    if(body.action==='revision'){
      if(revisionCount>=Number(job.included_revisions||0))return NextResponse.json({error:'The included revision allowance has already been used. Please contact the studio if you need anything else.'},{status:409});
      const notes=String(body.notes||'').trim();
      if(notes.length<3)return NextResponse.json({error:'Tell us the specific change you need.'},{status:400});
      if(notes.length>3000)return NextResponse.json({error:'Please keep revision notes under 3,000 characters.'},{status:400});
      const revisionNumber=revisionCount+1;
      const {error:insertError}=await db.from('mix_revisions').insert({mix_job_id:job.id,revision_number:revisionNumber,client_notes:notes});
      if(insertError)throw insertError;
      const now=new Date().toISOString();
      await db.from('mix_jobs').update({status:'revisions',updated_at:now}).eq('id',job.id);
      await db.from('mix_tracks').update({status:'revisions'}).eq('mix_job_id',job.id);
      await db.from('mix_activity').insert({mix_job_id:job.id,event_type:'revision_requested',channel:'review_link',status:'recorded',detail:`Client requested revision ${revisionNumber}: ${notes}`});
      await notifyOwners({request,job,customer:job.customers,action:'revision',notes});
      return NextResponse.json({ok:true,status:'revisions',revisionNumber});
    }

    return NextResponse.json({error:'Invalid action.'},{status:400});
  }catch(error){return NextResponse.json({error:error.message||'Could not update the mix review.'},{status:500})}
}

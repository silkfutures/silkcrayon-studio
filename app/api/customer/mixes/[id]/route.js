import {NextResponse} from 'next/server';
import {getCustomerContext} from '../../../../../lib/customerAuth';
import {getAdminDb} from '../../../../../lib/supabase';
import {ownerEmails,sendEmail} from '../../../../../lib/notifications';

const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

export async function POST(req,{params}){
  try{
    const ctx=await getCustomerContext();
    if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
    const {id}=await params,b=await req.json(),db=getAdminDb();
    const {data:j}=await db.from('mix_jobs').select('*').eq('id',id).eq('customer_id',ctx.customer.id).single();
    if(!j)return NextResponse.json({error:'Mix not found.'},{status:404});

    let notes='';
    if(b.action==='approve'){
      if(!['first_mix_sent','revisions'].includes(j.status))return NextResponse.json({error:'There is no mix awaiting approval.'},{status:409});
      const now=new Date().toISOString();
      await db.from('mix_jobs').update({status:'approved',updated_at:now}).eq('id',id);
      await db.from('mix_tracks').update({status:'approved'}).eq('mix_job_id',id);
      await db.from('mix_activity').insert({mix_job_id:id,event_type:'client_approved',channel:'customer_portal',status:'recorded',detail:'Client approved the latest mix version.'});
    }else if(b.action==='revision'){
      const {count}=await db.from('mix_revisions').select('id',{count:'exact',head:true}).eq('mix_job_id',id);
      if(!['first_mix_sent','revisions'].includes(j.status)||Number(count)>=Number(j.included_revisions))return NextResponse.json({error:'No revision rounds remain.'},{status:409});
      notes=String(b.notes||'').trim();
      if(!notes)return NextResponse.json({error:'Add your revision notes.'},{status:400});
      if(notes.length>3000)return NextResponse.json({error:'Please keep revision notes under 3,000 characters.'},{status:400});
      const revisionNumber=Number(count||0)+1;
      await db.from('mix_revisions').insert({mix_job_id:id,revision_number:revisionNumber,client_notes:notes});
      await db.from('mix_jobs').update({status:'revisions',updated_at:new Date().toISOString()}).eq('id',id);
      await db.from('mix_tracks').update({status:'revisions'}).eq('mix_job_id',id);
      await db.from('mix_activity').insert({mix_job_id:id,event_type:'revision_requested',channel:'customer_portal',status:'recorded',detail:`Client requested revision ${revisionNumber}: ${notes}`});
    }else return NextResponse.json({error:'Invalid action.'},{status:400});

    const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
    const artist=ctx.customer.artist_name||ctx.customer.full_name||'Customer';
    const approved=b.action==='approve';
    const subject=approved?`Mix approved ✓ — ${j.track_title} · ${artist}`:`Revision requested — ${j.track_title} · ${artist}`;
    const detail=approved
      ? `<p><b>${escapeHtml(artist)}</b> approved <b>${escapeHtml(j.track_title)}</b>. No further client changes are requested on this version.</p>`
      : `<p><b>${escapeHtml(artist)}</b> requested changes to <b>${escapeHtml(j.track_title)}</b>.</p><div style="margin:18px 0;padding:16px;border-left:3px solid #c394ff;background:#110c16;white-space:pre-wrap">${escapeHtml(notes)}</div>`;
    for(const email of await ownerEmails())await sendEmail({to:email,subject,html:`<div style="font-family:Arial;background:#070608;color:#fff;padding:28px"><div style="max-width:620px;margin:auto;border:1px solid #3a3043;padding:28px"><div style="color:#c394ff;letter-spacing:3px;font-size:11px">SILKCRAYON OS</div><h1>${approved?'Mix approved.':'Revision requested.'}</h1>${detail}<p><a href="${base}/admin/mixes/${id}" style="display:inline-block;background:#c394ff;color:#0d0911;padding:14px 18px;text-decoration:none;font-weight:900">OPEN MIX JOB →</a></p></div></div>`});
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:e.message||'Could not update mix.'},{status:500})}
}

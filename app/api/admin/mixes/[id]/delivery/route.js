import {NextResponse} from 'next/server';
import crypto from 'crypto';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {sendEmail} from '../../../../../../lib/notifications';
import {sendSms,normalizePhone} from '../../../../../../lib/sms';
import {canonicalSiteUrl} from '../../../../../../lib/mixCustomerEmail';

const BUCKET='session-deliveries';
const site=()=>canonicalSiteUrl();
const safeName=value=>String(value||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120)||'file';
const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function mixReviewEmail(job,customer,{href,expiresAt,fileCount=1}={}){
  const artist=escapeHtml(customer?.artist_name||customer?.full_name||'there');
  const title=escapeHtml(job.track_title||'your mix');
  const expiry=expiresAt?`<p style="font-size:12px;color:#8f8794;margin-top:18px">Uploaded files are available for 30 days. Save your copy before the link expires.</p>`:'';
  return {
    subject:`Your mix is ready to review — ${job.track_title}`,
    html:`<div style="margin:0;background:#050506;padding:36px 18px;font-family:Arial,sans-serif;color:#fff"><div style="max-width:620px;margin:0 auto;border:1px solid #352b3d;background:#09070a;padding:34px"><div style="color:#c394ff;letter-spacing:3px;font-size:11px;font-weight:800">SILKCRAYON STUDIOS</div><h1 style="font-size:38px;line-height:1.05;margin:18px 0">Your mix is ready.</h1><p style="color:#c7becb;line-height:1.7">Hi ${artist}, your latest version of <b style="color:#fff">${title}</b> is ready to review${fileCount>1?` with ${fileCount} files`:''}.</p><p style="color:#c7becb;line-height:1.7">Listen through, then use the review page to <b style="color:#fff">approve the mix</b>. If there is a specific change you need, you can request it from the same page.</p><p style="margin:28px 0"><a href="${href}" style="display:block;text-align:center;background:#c394ff;color:#0d0911;padding:16px 20px;text-decoration:none;font-weight:900;border-radius:10px">REVIEW YOUR MIX →</a></p>${expiry}<p style="font-size:11px;color:#736b78;margin-top:28px">This link is private to your Silkcrayon delivery.</p></div></div>`
  };
}

export async function POST(req,{params}){
  try{
    const ctx=await getStaffContext();
    if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
    const {id}=await params,db=getAdminDb(),body=await req.json();
    const {data:job,error}=await db.from('mix_jobs').select('*,customers(*)').eq('id',id).single();
    if(error||!job)return NextResponse.json({error:'Mix job not found.'},{status:404});
    if(Number(job.paid_amount_pence)<Number(job.quoted_amount_pence))return NextResponse.json({error:'Payment gate: files cannot be delivered for an unpaid mix job.'},{status:409});

    if(body.action==='prepare_upload'){
      const fileName=safeName(body.fileName);
      const path=`${job.customer_id}/mixes/${job.id}/${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${fileName}`;
      const {data,error:uploadError}=await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if(uploadError)throw uploadError;
      return NextResponse.json({bucket:BUCKET,path:data.path||path,token:data.token});
    }

    let externalUrl=null,storagePath=null,fileName=null,fileCount=1;
    if(body.action==='deliver_link'){
      try{
        const parsed=new URL(String(body.externalUrl||''));
        if(!['http:','https:'].includes(parsed.protocol))throw new Error();
        externalUrl=parsed.toString();
      }catch{return NextResponse.json({error:'Paste a valid https:// file link.'},{status:400})}
    }else if(body.action==='deliver_upload'){
      storagePath=String(body.storagePath||'');
      fileName=safeName(body.fileName);
      if(!storagePath.startsWith(`${job.customer_id}/mixes/${job.id}/`))return NextResponse.json({error:'Invalid upload path.'},{status:400});
    }else if(body.action==='deliver_uploads'){
      const files=Array.isArray(body.files)?body.files:[];
      if(files.length<2||files.length>50)return NextResponse.json({error:'Choose between 2 and 50 files.'},{status:400});
      const bundle=files.map(file=>({path:String(file?.storagePath||''),name:safeName(file?.fileName)}));
      if(bundle.some(file=>!file.path.startsWith(`${job.customer_id}/mixes/${job.id}/`)))return NextResponse.json({error:'Invalid upload path.'},{status:400});
      storagePath=JSON.stringify(bundle);
      fileCount=bundle.length;
      fileName=`${fileCount} files`;
    }else return NextResponse.json({error:'Invalid delivery action.'},{status:400});

    const revisionId=body.revisionId||null;
    if(revisionId){
      const {data:revision}=await db.from('mix_revisions').select('id').eq('id',revisionId).eq('mix_job_id',id).maybeSingle();
      if(!revision)return NextResponse.json({error:'Revision does not belong to this job.'},{status:400});
    }

    const expiresAt=storagePath?new Date(Date.now()+30*86400000).toISOString():null;
    const {data:delivery,error:deliveryError}=await db.from('session_deliveries').insert({
      booking_id:null,mix_job_id:id,mix_revision_id:revisionId,customer_id:job.customer_id,created_by_user_id:ctx.user.id,
      delivery_type:externalUrl?'link':'upload',external_url:externalUrl,storage_path:storagePath,file_name:fileName,
      share_token:crypto.randomUUID(),expires_at:expiresAt
    }).select().single();
    if(deliveryError)throw deliveryError;

    const href=`${site()}/files/${delivery.share_token}`,customer=job.customers;
    const message=mixReviewEmail(job,customer,{href,expiresAt,fileCount});
    let emailSent=false,smsSent=false;
    if(customer?.email){const result=await sendEmail({to:customer.email,...message});emailSent=Boolean(result.ok)}
    if(customer?.phone){
      const text=`Silkcrayon: your ${job.track_title} mix is ready to review 🎧 Approve it or request a specific change here: ${href}`;
      const result=await sendSms({to:normalizePhone(customer.phone)||customer.phone,body:text});smsSent=Boolean(result.ok);
    }

    const nextStatus=revisionId?'revisions':['approved','delivered'].includes(job.status)?job.status:'first_mix_sent';
    await db.from('mix_jobs').update({status:nextStatus,updated_at:new Date().toISOString()}).eq('id',id);
    await db.from('mix_tracks').update({status:nextStatus==='delivered'?'delivered':nextStatus==='approved'?'approved':revisionId?'revisions':'first_mix_sent'}).eq('mix_job_id',id);
    return NextResponse.json({ok:true,id:delivery.id,href,emailSent,smsSent,fileCount});
  }catch(error){return NextResponse.json({error:error.message||'Could not deliver mix files.'},{status:500})}
}

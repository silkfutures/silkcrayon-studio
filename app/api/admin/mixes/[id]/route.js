import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {newToken,tokenHash} from '../../../../../lib/customerAuth';
import {sendEmail} from '../../../../../lib/notifications';
import {sendSms,normalizePhone} from '../../../../../lib/sms';
import {getStripe} from '../../../../../lib/stripe';
import {manualMixPaymentUpdate} from '../../../../../lib/mixPayment';
import {canonicalSiteUrl,mixSetupEmail,mixServiceLabels} from '../../../../../lib/mixCustomerEmail';

const allowed=['ready_to_start','mixing','first_mix_sent','revisions','approved','delivered'];

function storagePaths(value){
  if(!value)return [];
  try{
    const parsed=JSON.parse(String(value));
    if(Array.isArray(parsed))return parsed.map(item=>String(item?.path||'')).filter(Boolean);
  }catch{}
  return [String(value)].filter(Boolean);
}

export async function PATCH(req,{params}){
  try{
    const ctx=await getStaffContext();
    if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
    const {id}=await params;
    const b=await req.json();
    const db=getAdminDb();
    const {data:job,error}=await db.from('mix_jobs').select('*,customers(*)').eq('id',id).single();
    if(error||!job)return NextResponse.json({error:'Mix job not found.'},{status:404});

    const quote=()=>{
      const price=Math.round(Number(b.quotedPrice)*100);
      const revs=Number(b.includedRevisions);
      if(!Number.isFinite(price)||price<100||!Number.isInteger(revs)||revs<0||revs>10)throw new Error('Enter a valid price and revision allowance.');
      const turnaround=String(b.turnaroundText||'').trim();
      if(!turnaround)throw new Error('Choose a turnaround time.');
      return {
        quoted_amount_pence:price,
        payment_due_date:b.paymentDueDate||null,
        turnaround_text:turnaround,
        included_revisions:revs,
        service_type:b.serviceType||job.service_type,
        updated_at:new Date().toISOString()
      };
    };

    if(b.saveQuote){
      const update=quote();
      const {error:updateError}=await db.from('mix_jobs').update(update).eq('id',id);
      if(updateError)throw updateError;
      await db.from('mix_activity').insert({mix_job_id:id,event_type:'quote_saved',channel:'internal',status:'recorded',detail:'Quote, turnaround and revision allowance saved internally. No customer message sent.',created_by_user_id:ctx.user.id});
      return NextResponse.json({ok:true});
    }

    if(b.sendPaymentRequest){
      const update=quote();
      const outstanding=Math.max(0,update.quoted_amount_pence-Number(job.paid_amount_pence||0));
      if(!outstanding)return NextResponse.json({error:'There is no outstanding balance to request.'},{status:409});

      const {data:tracks=[]}=await db.from('mix_tracks').select('title').eq('mix_job_id',id).order('position');
      const trackTitles=(tracks.length?tracks.map(t=>t.title):[job.track_title]).filter(Boolean);
      const token=newToken();
      const expires=new Date(Date.now()+7*86400000).toISOString();
      const {error:tokenError}=await db.from('customer_access_tokens').insert({customer_id:job.customer_id,token_hash:tokenHash(token),expires_at:expires});
      if(tokenError)throw tokenError;

      const portal=`${canonicalSiteUrl()}/account/access?token=${encodeURIComponent(token)}&next=/account/mixes/${id}`;
      const stripe=getStripe();
      const session=await stripe.checkout.sessions.create({
        mode:'payment',
        customer_email:job.customers.email,
        line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:outstanding,product_data:{name:`${mixServiceLabels[update.service_type]||'Mixing'} — ${trackTitles.join(', ')}`}}}],
        metadata:{mix_job_id:id,mix_quoted_total:String(update.quoted_amount_pence)},
        success_url:`${portal}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:portal
      });

      const now=new Date().toISOString();
      const {error:jobUpdateError}=await db.from('mix_jobs').update({...update,status:'awaiting_payment',quote_sent_at:now,stripe_checkout_session_id:session.id}).eq('id',id);
      if(jobUpdateError)throw jobUpdateError;

      const emailJob={...job,...update,id};
      const message=mixSetupEmail({job:emailJob,customer:job.customers,tracks:trackTitles,outstandingPence:outstanding,paymentUrl:session.url,dueDate:update.payment_due_date});
      let emailStatus='skipped',smsStatus='skipped';
      if(job.customers.email){
        const result=await sendEmail({to:job.customers.email,...message});
        emailStatus=result.ok?'sent':result.skipped?'skipped':'failed';
      }
      if(job.customers.phone&&job.customers.sms_service_consent){
        const due=update.payment_due_date?` Due ${new Date(`${update.payment_due_date}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'})}.`:'';
        const result=await sendSms({to:normalizePhone(job.customers.phone)||job.customers.phone,body:`Silkcrayon: your ${trackTitles.length>1?'mix project':trackTitles[0]} is set up. £${(outstanding/100).toFixed(2)} is ready for payment.${due} Pay here: ${session.url}`});
        smsStatus=result.ok?'sent':result.skipped?'skipped':'failed';
      }

      await db.from('mix_activity').insert([
        {mix_job_id:id,event_type:'payment_request_sent',channel:'system',status:'sent',detail:`£${(outstanding/100).toFixed(2)} · ${trackTitles.join(', ')} · ${update.turnaround_text}`,provider_reference:session.id,created_by_user_id:ctx.user.id},
        {mix_job_id:id,event_type:'payment_request_email',channel:'email',status:emailStatus,detail:job.customers.email||'No email'},
        {mix_job_id:id,event_type:'payment_request_sms',channel:'sms',status:smsStatus,detail:job.customers.phone||'No phone or no service consent'}
      ]);
      return NextResponse.json({ok:true,paymentUrl:session.url,emailStatus,smsStatus});
    }

    if(b.markPaid){
      let update;
      try{update=manualMixPaymentUpdate(job,b)}catch(e){return NextResponse.json({error:e.message},{status:400})}
      if(!update)return NextResponse.json({ok:true});
      const {data:recorded,error:paymentError}=await db.from('mix_jobs').update(update).eq('id',id).eq('updated_at',job.updated_at).select('id').maybeSingle();
      if(paymentError)throw paymentError;
      if(!recorded)return NextResponse.json({error:'This mix changed. Refresh and check its payment status before trying again.'},{status:409});
      const remaining=Math.max(0,Number(job.quoted_amount_pence)-Number(job.paid_amount_pence||0));
      const {error:activityError}=await db.from('mix_activity').insert({mix_job_id:id,event_type:'payment_received',channel:'manual',status:'recorded',detail:`Remaining payment recorded manually: £${(remaining/100).toFixed(2)} · ${update.payment_method}${update.payment_reference?' · '+update.payment_reference:''}. Pipeline: ${update.status.replaceAll('_',' ')}.`,created_by_user_id:ctx.user.id});
      return NextResponse.json({ok:true,warning:activityError?'Payment saved, but the activity history could not be recorded.':undefined});
    }

    if(b.status){
      if(!allowed.includes(b.status))return NextResponse.json({error:'Invalid pipeline stage.'},{status:400});
      if(Number(job.paid_amount_pence)<Number(job.quoted_amount_pence))return NextResponse.json({error:`Payment gate: £${((job.quoted_amount_pence-job.paid_amount_pence)/100).toFixed(2)} is still outstanding.`},{status:409});
      await db.from('mix_jobs').update({status:b.status,updated_at:new Date().toISOString()}).eq('id',id);
      await db.from('mix_activity').insert({mix_job_id:id,event_type:'status_changed',channel:'internal',status:'recorded',detail:`Pipeline moved to ${b.status.replaceAll('_',' ')}.`,created_by_user_id:ctx.user.id});
      return NextResponse.json({ok:true});
    }

    return NextResponse.json({error:'Nothing to update.'},{status:400});
  }catch(e){
    return NextResponse.json({error:e.message||'Could not update mix job.'},{status:500});
  }
}

export async function DELETE(req,{params}){
  try{
    const ctx=await getStaffContext();
    if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
    const {id}=await params;
    const db=getAdminDb();
    const {data:job,error}=await db.from('mix_jobs').select('*').eq('id',id).single();
    if(error||!job)return NextResponse.json({error:'Mix job not found.'},{status:404});

    if(job.stripe_payment_intent_id||String(job.payment_method||'').toLowerCase()==='stripe'){
      return NextResponse.json({error:'This mix has a recorded Stripe payment and cannot be deleted from accounting. Refund or correct the payment instead.'},{status:409});
    }

    if(job.stripe_checkout_session_id){
      try{
        const stripe=getStripe();
        const session=await stripe.checkout.sessions.retrieve(job.stripe_checkout_session_id);
        if(session?.status==='open')await stripe.checkout.sessions.expire(job.stripe_checkout_session_id);
      }catch{}
    }

    const [{data:sources=[]},{data:deliveries=[]}]=await Promise.all([
      db.from('mix_source_files').select('storage_path').eq('mix_job_id',id),
      db.from('session_deliveries').select('storage_path').eq('mix_job_id',id)
    ]);
    const paths=[...sources.flatMap(row=>storagePaths(row.storage_path)),...deliveries.flatMap(row=>storagePaths(row.storage_path))];
    const unique=[...new Set(paths.filter(Boolean))];

    const {error:deleteError}=await db.from('mix_jobs').delete().eq('id',id);
    if(deleteError)throw deleteError;

    let cleanupWarning=null;
    if(unique.length){
      for(let i=0;i<unique.length;i+=100){
        const {error:removeError}=await db.storage.from('session-deliveries').remove(unique.slice(i,i+100));
        if(removeError){cleanupWarning='Mix deleted from the system, but some stored files could not be removed automatically.';console.error('Could not remove some deleted mix files',removeError.message||removeError)}
      }
    }
    return NextResponse.json({ok:true,warning:cleanupWarning});
  }catch(e){
    return NextResponse.json({error:e.message||'Could not delete mix job.'},{status:500});
  }
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {initialMixPaymentState} from '../../../../lib/mixPayment';
import {newToken,tokenHash} from '../../../../lib/customerAuth';
import {getStripe} from '../../../../lib/stripe';
import {sendEmail} from '../../../../lib/notifications';
import {sendSms,normalizePhone} from '../../../../lib/sms';
import {canonicalSiteUrl,mixSetupEmail,mixServiceLabels} from '../../../../lib/mixCustomerEmail';

async function createNotificationLog(db,{customerId,deliveryId=null,type,recipient,subject,channel='email'}){
  try{
    const row={booking_id:null,customer_id:customerId||null,notification_type:type,recipient,subject,status:'queued',channel};
    if(deliveryId)row.session_delivery_id=deliveryId;
    const {data,error}=await db.from('notification_log').insert(row).select('id').single();
    if(error)throw error;
    return data?.id||null;
  }catch(error){
    console.error('Mix notification log create failed',type,error?.message||error);
    return null;
  }
}
async function finishNotificationLog(db,id,result){
  if(!id)return;
  try{await db.from('notification_log').update({status:result?.ok?'sent':result?.skipped?'skipped':'failed',provider_id:result?.id||null,error:result?.error||null,sent_at:result?.ok?new Date().toISOString():null}).eq('id',id)}catch(error){console.error('Mix notification log update failed',error?.message||error)}
}

export async function POST(req){
  try{
    const ctx=await getStaffContext();
    if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});

    const b=await req.json();
    const quoted=Math.round(Number(b.quotedPrice)*100);
    const tracks=(Array.isArray(b.tracks)?b.tracks:[b.trackTitle]).map(x=>String(x||'').trim()).filter(Boolean);
    const revisions=Number(b.includedRevisions??1);
    const turnaround=String(b.turnaroundText||'7 working days from payment and complete files').trim();
    if(!b.customerId||!tracks.length||!Number.isFinite(quoted)||quoted<0)return NextResponse.json({error:'Customer, at least one track and a valid quote are required.'},{status:400});
    if(!Number.isInteger(revisions)||revisions<0||revisions>10)return NextResponse.json({error:'Choose a valid revision allowance.'},{status:400});
    if(!turnaround)return NextResponse.json({error:'Choose a turnaround time.'},{status:400});
    const paymentRequestMethod=b.paymentMode==='paid'?null:(b.paymentRequestMethod==='stripe'?'stripe':'monzo');
    let monzoPaymentUrl=null;
    if(paymentRequestMethod==='monzo'&&String(b.monzoPaymentUrl||'').trim()){
      try{const url=new URL(String(b.monzoPaymentUrl).trim());if(url.protocol!=='https:')throw new Error();monzoPaymentUrl=url.toString()}catch{return NextResponse.json({error:'Paste a valid https Monzo payment link.'},{status:400})}
    }
    if(Boolean(b.notifyCustomer)&&b.paymentMode!=='paid'&&paymentRequestMethod==='stripe'&&quoted<30)return NextResponse.json({error:'Use a quote of at least £0.30 to send a Stripe payment request.'},{status:400});

    const requestedPaid=Math.round(Number(b.paidAmount)*100);
    const now=new Date().toISOString();
    let payment;
    try{
      payment=initialMixPaymentState({
        quotedAmountPence:quoted,
        paymentMode:b.paymentMode||'unpaid',
        paidAmountPence:Number.isFinite(requestedPaid)?requestedPaid:0,
        paymentMethod:b.paymentMethod||'bank_transfer',
        paymentReference:b.paymentReference
      },now);
    }catch(e){return NextResponse.json({error:e.message},{status:400})}

    const db=getAdminDb();
    const {data:customer,error:customerError}=await db.from('customers').select('id,full_name,artist_name,email,phone,sms_service_consent').eq('id',b.customerId).single();
    if(customerError||!customer)return NextResponse.json({error:'Customer not found.'},{status:404});

    const {data,error}=await db.from('mix_jobs').insert({
      customer_id:b.customerId,
      track_title:tracks[0],
      service_type:b.serviceType||'mix_master',
      quoted_amount_pence:quoted,
      ...payment,
      payment_due_date:payment.status==='ready_to_start'?null:(b.paymentDueDate||null),
      files_received:Boolean(b.filesReceived),
      reference_tracks:String(b.referenceTracks||'').trim()||null,
      notes:String(b.notes||'').trim()||null,
      vocal_tuning_editing:Boolean(b.vocalTuningEditing),
      stem_delivery:Boolean(b.stemDelivery),
      turnaround_text:turnaround,
      included_revisions:revisions,
      created_by_user_id:ctx.user.id
    }).select('id').single();
    if(error)throw error;

    await db.from('mix_tracks').delete().eq('mix_job_id',data.id);
    const {error:trackError}=await db.from('mix_tracks').insert(tracks.map((title,position)=>({mix_job_id:data.id,title,position})));
    if(trackError){await db.from('mix_jobs').delete().eq('id',data.id);throw trackError}

    const outstanding=Math.max(0,quoted-payment.paid_amount_pence);
    const activity=[{
      mix_job_id:data.id,event_type:'job_created',channel:'internal',status:'recorded',
      detail:`Created with ${tracks.length} track${tracks.length===1?'':'s'} · ${turnaround} · ${revisions} revision round${revisions===1?'':'s'}.`,
      created_by_user_id:ctx.user.id
    }];
    if(payment.paid_amount_pence>0)activity.push({
      mix_job_id:data.id,event_type:'payment_received',channel:'manual',status:'recorded',
      detail:outstanding===0
        ?`Full payment recorded on creation: £${(quoted/100).toFixed(2)} · ${payment.payment_method}${payment.payment_reference?' · '+payment.payment_reference:''}. Pipeline: ready to start.`
        :`Deposit / part payment recorded on creation: £${(payment.paid_amount_pence/100).toFixed(2)} of £${(quoted/100).toFixed(2)} · £${(outstanding/100).toFixed(2)} outstanding · ${payment.payment_method}${payment.payment_reference?' · '+payment.payment_reference:''}.`,
      created_by_user_id:ctx.user.id
    });
    await db.from('mix_activity').insert(activity);

    let warning=null,paymentUrl=null,emailSent=false,smsSent=false;
    if(Boolean(b.notifyCustomer)){
      const jobForEmail={
        id:data.id,track_title:tracks[0],service_type:b.serviceType||'mix_master',turnaround_text:turnaround,
        included_revisions:revisions,vocal_tuning_editing:Boolean(b.vocalTuningEditing)
      };
      try{
        if(outstanding>0){
          if(paymentRequestMethod==='monzo'){
            if(!monzoPaymentUrl)throw new Error('Paste the Monzo payment link before notifying the customer.');
            paymentUrl=monzoPaymentUrl;
            await db.from('mix_jobs').update({status:'awaiting_payment',quote_sent_at:now,stripe_checkout_session_id:null,updated_at:now}).eq('id',data.id);
          }else{
            const token=newToken();
            const expiresAt=new Date(Date.now()+7*86400000).toISOString();
            const {error:tokenError}=await db.from('customer_access_tokens').insert({customer_id:customer.id,token_hash:tokenHash(token),expires_at:expiresAt});
            if(tokenError)throw tokenError;
            const portal=`${canonicalSiteUrl()}/account/access?token=${encodeURIComponent(token)}&next=/account/mixes/${data.id}`;
            const stripe=getStripe();
            const session=await stripe.checkout.sessions.create({
              mode:'payment',
              customer_email:customer.email,
              line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:outstanding,product_data:{name:`${mixServiceLabels[jobForEmail.service_type]||'Mixing'} — ${tracks.join(', ')}`}}}],
              metadata:{mix_job_id:data.id,mix_quoted_total:String(quoted)},
              success_url:`${portal}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
              cancel_url:portal
            });
            paymentUrl=session.url;
            await db.from('mix_jobs').update({status:'awaiting_payment',quote_sent_at:now,stripe_checkout_session_id:session.id,updated_at:now}).eq('id',data.id);
          }
          const message=mixSetupEmail({job:jobForEmail,customer,tracks,outstandingPence:outstanding,paymentUrl,dueDate:b.paymentDueDate||null});
          if(customer.email){
            const logId=await createNotificationLog(db,{customerId:customer.id,type:'mix_setup_payment_email',recipient:customer.email,subject:message.subject,channel:'email'});
            const sent=await sendEmail({to:customer.email,...message});emailSent=Boolean(sent.ok);
            await finishNotificationLog(db,logId,sent);
            if(!sent.ok)warning=`Mix created, but the customer email did not send: ${sent.error||'email provider error'}`;
          }
          if(customer.phone&&customer.sms_service_consent){
            const due=b.paymentDueDate?` Due ${new Date(`${b.paymentDueDate}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'})}.`:' ';
            const smsBody=`Silkcrayon — ${mixServiceLabels[jobForEmail.service_type]||'Mix & Master'}: ${tracks.length>1?`${tracks.length} tracks`:`“${tracks[0]}”`}. £${(outstanding/100).toFixed(2)} due.${due} Pay: ${paymentUrl}`;
            const recipient=normalizePhone(customer.phone)||customer.phone;
            const logId=await createNotificationLog(db,{customerId:customer.id,type:'mix_setup_payment_sms',recipient,subject:smsBody.slice(0,80),channel:'sms'});
            const sent=await sendSms({to:recipient,body:smsBody});
            smsSent=Boolean(sent.ok);
            await finishNotificationLog(db,logId,sent);
          }
          await db.from('mix_activity').insert({mix_job_id:data.id,event_type:'payment_request_sent',channel:'system',status:emailSent||smsSent?'sent':'failed',detail:`£${(outstanding/100).toFixed(2)} · ${paymentRequestMethod==='monzo'?'Monzo link':'Stripe checkout'} · setup / what-to-expect email${emailSent?' sent':' not sent'} · SMS${smsSent?' sent':' not sent'}`,provider_reference:paymentRequestMethod==='stripe'?paymentUrl:null,created_by_user_id:ctx.user.id});
        }else{
          const message=mixSetupEmail({job:jobForEmail,customer,tracks,outstandingPence:0,paymentUrl:null});
          if(customer.email){
            const logId=await createNotificationLog(db,{customerId:customer.id,type:'mix_setup_paid_email',recipient:customer.email,subject:message.subject,channel:'email'});
            const sent=await sendEmail({to:customer.email,...message});emailSent=Boolean(sent.ok);
            await finishNotificationLog(db,logId,sent);
            if(!sent.ok)warning=`Mix created as paid, but the confirmation email did not send: ${sent.error||'email provider error'}`;
          }
          await db.from('mix_activity').insert({mix_job_id:data.id,event_type:'mix_setup_confirmation',channel:'email',status:emailSent?'sent':'failed',detail:emailSent?'Paid mix confirmation / what-to-expect email sent.':'Customer confirmation email was not sent.',created_by_user_id:ctx.user.id});
        }
      }catch(notificationError){
        warning=`Mix created, but customer notification needs retrying: ${notificationError.message||'notification failed'}`;
        try{await db.from('mix_activity').insert({mix_job_id:data.id,event_type:'customer_setup_notification',channel:'system',status:'failed',detail:warning,created_by_user_id:ctx.user.id});}catch{}
      }
    }

    return NextResponse.json({
      id:data.id,
      paymentStatus:outstanding===0&&quoted>0?'paid':payment.paid_amount_pence>0?'partial_paid':'unpaid',
      paidAmountPence:payment.paid_amount_pence,
      outstandingPence:outstanding,
      paymentUrl,emailSent,smsSent,warning
    });
  }catch(e){
    return NextResponse.json({error:e.message||'Could not create mix job.'},{status:500});
  }
}

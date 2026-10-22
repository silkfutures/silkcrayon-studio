import {getStripe} from './stripe';
import {sendEmail} from './notifications';
export async function notifyMixEngineer(db,job,action,notes=''){
 if(!job.engineer_user_id)return;
 const {data:staff}=await db.from('staff_profiles').select('email,full_name,engineer_name').eq('user_id',job.engineer_user_id).maybeSingle();
 if(!staff?.email)return;
 const title=String(job.track_title||'Mix');
 const msg=action==='approved'?'Client approved the latest mix.':'Client requested a revision.';
 await sendEmail({to:staff.email,subject:`${msg} — ${title}`,html:`<div style="font-family:Arial;background:#09070b;color:#fff;padding:26px"><h2>${msg}</h2><p>Job: ${escape(title)}</p><p style="white-space:pre-wrap">${escape(notes)}</p><a href="${process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon.com'}/admin/engineer/mixes/${job.id}" style="color:#c394ff">Open your assigned mix →</a></div>`});
}
function escape(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// This can be retried by owner if Stripe is temporarily unavailable. Unique DB row + Stripe
// transfer-group lookup + deterministic Stripe idempotency key prevent double payouts.
export async function releaseApprovedMixPayout(db,jobId){
 const {data:job}=await db.from('mix_jobs').select('*').eq('id',jobId).single();
 if(!job||!['approved','delivered'].includes(job.status)||!job.engineer_user_id||!Number(job.engineer_fee_pence))return {skipped:'not_eligible'};
 const amount=Number(job.engineer_fee_pence);
 await db.from('mix_engineer_payouts').upsert({mix_job_id:job.id,engineer_user_id:job.engineer_user_id,amount_pence:amount,status:'pending'},{onConflict:'mix_job_id',ignoreDuplicates:true});
 const {data:record}=await db.from('mix_engineer_payouts').select('*').eq('mix_job_id',job.id).single();
 if(!record||record.status==='paid'||record.stripe_transfer_id)return {skipped:'already_paid'};
 const {data:staff}=await db.from('staff_profiles').select('stripe_connect_account_id,stripe_transfers_active').eq('user_id',record.engineer_user_id).maybeSingle();
 if(!staff?.stripe_connect_account_id||!staff.stripe_transfers_active){await db.from('mix_engineer_payouts').update({status:'on_hold',error:'Engineer must finish Stripe Connect onboarding.'}).eq('mix_job_id',jobId).neq('status','paid');return {skipped:'connect_setup'};}
 if(job.payment_method!=='stripe'||!job.stripe_payment_intent_id||Number(job.paid_amount_pence)<Number(job.quoted_amount_pence)){
  await db.from('mix_engineer_payouts').update({status:'needs_approval',error:'Original mix not fully funded by Stripe. Owner must pay manually.'}).eq('mix_job_id',jobId).neq('status','paid');return {skipped:'not_stripe_funded'};
 }
 const {data:lock}=await db.from('mix_engineer_payouts').update({status:'processing',error:null}).eq('mix_job_id',jobId).in('status',['pending','failed','on_hold']).select('mix_job_id').maybeSingle();
 if(!lock)return {skipped:'already_processing'};
 try{
  const stripe=getStripe();const pi=await stripe.paymentIntents.retrieve(job.stripe_payment_intent_id);
  const charge=typeof pi.latest_charge==='string'?pi.latest_charge:pi.latest_charge?.id;
  if(pi.currency!=='gbp'||!charge||Number(pi.amount_received)<amount)throw Error('Stripe original card payment is insufficient to fund the engineer fee.');
  const group=`silk_mix_${job.id}`;
  const list=await stripe.transfers.list({transfer_group:group,limit:20});
  let transfer=list.data.find(t=>t.destination===staff.stripe_connect_account_id&&t.amount===amount&&!t.reversed);
  if(!transfer)transfer=await stripe.transfers.create({amount,currency:'gbp',destination:staff.stripe_connect_account_id,source_transaction:charge,transfer_group:group,description:`Silkcrayon approved mix — ${job.track_title}`.slice(0,200),metadata:{mix_job_id:job.id}},{idempotencyKey:`silk-mix-approved-${job.id}`});
  await db.from('mix_engineer_payouts').update({status:'paid',stripe_transfer_id:transfer.id,paid_at:new Date().toISOString(),error:null}).eq('mix_job_id',job.id);
  return {paid:true,transferId:transfer.id};
 }catch(e){await db.from('mix_engineer_payouts').update({status:'failed',error:String(e.message||e).slice(0,350)}).eq('mix_job_id',job.id);return {error:String(e.message||e)};}
}

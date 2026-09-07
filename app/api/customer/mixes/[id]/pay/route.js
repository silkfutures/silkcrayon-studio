import {NextResponse} from 'next/server';
import {getCustomerContext} from '../../../../../../lib/customerAuth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {getStripe} from '../../../../../../lib/stripe';

export async function POST(req,{params}){
 try{
  const ctx=await getCustomerContext();
  if(!ctx)return NextResponse.redirect(new URL('/account/login',req.url),303);
  const {id}=await params,db=getAdminDb();
  const [{data:j},{data:tracks=[]}]=await Promise.all([
   db.from('mix_jobs').select('*').eq('id',id).eq('customer_id',ctx.customer.id).single(),
   db.from('mix_tracks').select('title').eq('mix_job_id',id).order('position')
  ]);
  const outstanding=j?Math.max(0,j.quoted_amount_pence-j.paid_amount_pence):0;
  if(!j||!['quote_sent','awaiting_payment'].includes(j.status)||outstanding<100)return NextResponse.json({error:'This quote is not available for payment.'},{status:400});
  const stripe=getStripe(),base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
  const session=await stripe.checkout.sessions.create({
   mode:'payment',invoice_creation:{enabled:true},customer_email:ctx.customer.email,client_reference_id:j.id,
   metadata:{mix_job_id:j.id,customer_id:ctx.customer.id,payment_kind:'mix_quote',mix_quoted_total:String(j.quoted_amount_pence)},
   line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:outstanding,product_data:{
    name:`Silkcrayon — ${tracks.map(t=>t.title).join(', ')||j.track_title}`,
    description:`${j.turnaround_text||'Tailored mix service'} · ${j.included_revisions} revision round${j.included_revisions===1?'':'s'}`
   }}}],
   success_url:`${base}/account/mixes/${j.id}?paid=1`,cancel_url:`${base}/account/mixes/${j.id}`
  });
  await db.from('mix_jobs').update({status:'awaiting_payment',quote_accepted_at:new Date().toISOString(),stripe_checkout_session_id:session.id,updated_at:new Date().toISOString()}).eq('id',j.id);
  await db.from('mix_activity').insert({mix_job_id:j.id,event_type:'checkout_opened',channel:'stripe',status:'pending',detail:`Client opened payment for £${(outstanding/100).toFixed(2)}.`,provider_reference:session.id});
  return NextResponse.redirect(session.url,303);
 }catch(e){return NextResponse.json({error:e.message||'Could not start payment.'},{status:500})}
}

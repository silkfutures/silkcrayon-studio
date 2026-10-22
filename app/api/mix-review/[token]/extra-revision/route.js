import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../../lib/supabase';
import {getStripe} from '../../../../../lib/stripe';
export async function POST(req,{params}){
 try{
  const {token}=await params,db=getAdminDb();
  const {data:d}=await db.from('session_deliveries').select('mix_job_id,share_token').eq('share_token',token).maybeSingle();
  if(!d?.mix_job_id)return NextResponse.json({error:'Invalid mix review link.'},{status:404});
  const {data:j}=await db.from('mix_jobs').select('id,track_title,status,extra_revision_price_pence,customers(email)').eq('id',d.mix_job_id).single();
  const {data:latest}=await db.from('session_deliveries').select('share_token').eq('mix_job_id',j.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(latest?.share_token!==token||!['first_mix_sent','revisions'].includes(j.status))return NextResponse.json({error:'Use the latest active review link.'},{status:409});
  const amount=Number(j.extra_revision_price_pence||2500);
  if(!Number.isSafeInteger(amount)||amount<100)return NextResponse.json({error:'Invalid revision price.'},{status:400});
  const {data:order,error}=await db.from('mix_extra_revision_orders').insert({mix_job_id:j.id,amount_pence:amount}).select('id').single();if(error)throw error;
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
  const session=await getStripe().checkout.sessions.create({mode:'payment',customer_email:j.customers?.email||undefined,metadata:{mix_extra_revision_order_id:order.id},line_items:[{price_data:{currency:'gbp',unit_amount:amount,product_data:{name:`Additional mix revision — ${j.track_title}`}},quantity:1}],success_url:`${base}/files/${token}?revision_paid=1`,cancel_url:`${base}/files/${token}`},{idempotencyKey:`mix-extra-checkout-${order.id}`});
  await db.from('mix_extra_revision_orders').update({checkout_session_id:session.id}).eq('id',order.id);
  return NextResponse.json({url:session.url});
 }catch(e){return NextResponse.json({error:e.message||'Checkout unavailable'},{status:500})}
}

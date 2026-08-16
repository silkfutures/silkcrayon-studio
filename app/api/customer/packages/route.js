import { NextResponse } from 'next/server';
import { getCustomerContext } from '../../../../lib/customerAuth';
import { getAdminDb } from '../../../../lib/supabase';
import { getStripe } from '../../../../lib/stripe';
import {getPromotionFor} from '../../../../lib/promotions';
const CODE='RELAUNCH_2H_100';
export async function POST(req){try{
 const ctx=await getCustomerContext();if(!ctx)return NextResponse.json({error:'Sign in again.'},{status:401});
 const b=await req.json();if(Number(b.hours)!==2)return NextResponse.json({error:'Package not found.'},{status:400});
 const promo=await getPromotionFor('vocal-recording',120);if(!promo)return NextResponse.json({error:'The relaunch offer is not currently available.'},{status:410});
 const p={hours:2,amount:Number(promo.offer_price_pence),listAmount:Number(promo.normal_price_pence),label:'2 studio hours — Relaunch offer'};
 const db=getAdminDb();
 const {data:used,error:ue}=await db.from('studio_payments').select('id').eq('customer_id',ctx.customer.id).eq('discount_code',CODE).eq('status','paid').limit(1);if(ue)throw ue;
 if((used||[]).length)return NextResponse.json({error:'You have already used the 2 hours for £100 relaunch offer.'},{status:409});
 const {data:payment,error}=await db.from('studio_payments').insert({customer_id:ctx.customer.id,kind:'package',description:p.label,amount_pence:p.amount,list_amount_pence:p.listAmount,discount_code:promo.code,discount_amount_pence:p.listAmount-p.amount,hours_credit:p.hours,status:'pending',created_by_name:'Customer portal'}).select().single();if(error)throw error;
 const stripe=getStripe(),configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');const base=(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))?'https://silkcrayon.com':configured;
 const session=await stripe.checkout.sessions.create({mode:'payment',invoice_creation:{enabled:true},customer_email:ctx.customer.email,client_reference_id:payment.id,metadata:{studio_payment_id:payment.id,customer_id:ctx.customer.id,payment_kind:'relaunch',hours_credit:String(p.hours),offer_code:promo.code},line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:p.amount,product_data:{name:'Silkcrayon — 2 Hours for £100 Relaunch Offer',description:`Two prepaid studio hours for ${ctx.customer.artist_name||ctx.customer.full_name}`}}}],success_url:`${base}/relaunch-offer?paid=1`,cancel_url:`${base}/account?package=cancelled`});
 await db.from('studio_payments').update({stripe_checkout_session_id:session.id}).eq('id',payment.id);return NextResponse.json({url:session.url});
}catch(e){return NextResponse.json({error:e.message||'Could not create package payment.'},{status:500})}}

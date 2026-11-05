import { NextResponse } from 'next/server';
import { getCustomerContext } from '../../../../lib/customerAuth';
import { getAdminDb } from '../../../../lib/supabase';
import { getStripe } from '../../../../lib/stripe';
import {getPromotionFor} from '../../../../lib/promotions';
const CODE='RELAUNCH_2H_100';
export async function POST(req){try{
 const ctx=await getCustomerContext();if(!ctx)return NextResponse.json({error:'Sign in again.'},{status:401});
 const b=await req.json();if(![4,8].includes(Number(b.hours)))return NextResponse.json({error:'Package not found.'},{status:400});
 const p={hours:Number(b.hours),amount:Number(b.hours)===4?18000:32000,listAmount:Number(b.hours)*5000,label:`${b.hours}-hour 30-day Studio Pass`};
 const db=getAdminDb();

 const {data:payment,error}=await db.from('studio_payments').insert({customer_id:ctx.customer.id,kind:'package',description:p.label,amount_pence:p.amount,list_amount_pence:p.listAmount,discount_code:null,discount_amount_pence:p.listAmount-p.amount,hours_credit:p.hours,status:'pending',created_by_name:'Customer portal'}).select().single();if(error)throw error;
 const stripe=getStripe(),configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');const base=(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))?'https://silkcrayon.com':configured;
 const session=await stripe.checkout.sessions.create({mode:'payment',invoice_creation:{enabled:true},customer_email:ctx.customer.email,client_reference_id:payment.id,metadata:{studio_payment_id:payment.id,customer_id:ctx.customer.id,payment_kind:'studio_pass',hours_credit:String(p.hours),offer_code:''},line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:p.amount,product_data:{name:`Silkcrayon — ${p.hours}-Hour Studio Pass`,description:`Two prepaid studio hours for ${ctx.customer.artist_name||ctx.customer.full_name}`}}}],success_url:`${base}/studio-pass?paid=1&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/account?package=cancelled`});
 await db.from('studio_payments').update({stripe_checkout_session_id:session.id}).eq('id',payment.id);return NextResponse.json({url:session.url});
}catch(e){return NextResponse.json({error:e.message||'Could not create package payment.'},{status:500})}}

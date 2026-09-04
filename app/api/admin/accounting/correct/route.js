import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';

export async function POST(req){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const body=await req.json(),id=String(body.paymentId||''),reason=String(body.reason||'').trim().slice(0,240);if(!id||!reason)return NextResponse.json({error:'Payment and correction reason are required.'},{status:400});
  const db=getAdminDb();const {data:p,error}=await db.from('studio_payments').select('*').eq('id',id).single();if(error||!p)return NextResponse.json({error:'Payment not found.'},{status:404});
  if(p.stripe_payment_intent_id||p.stripe_checkout_session_id)return NextResponse.json({error:'This payment is linked to Stripe. Refund it through the Stripe workflow instead of voiding it.'},{status:409});
  if(p.status!=='paid')return NextResponse.json({error:'Only a paid manual transaction can be voided.'},{status:409});
  const now=new Date().toISOString();const {data:updated,error:ue}=await db.from('studio_payments').update({status:'voided',voided_at:now,voided_by_user_id:ctx.user.id,voided_by_name:ctx.profile.full_name,void_reason:reason}).eq('id',id).select().single();if(ue)throw ue;
  return NextResponse.json({ok:true,payment:updated});
 }catch(e){return NextResponse.json({error:e.message||'Could not correct payment.'},{status:500})}
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {getStripe} from '../../../../../lib/stripe';

export async function DELETE(req,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,db=getAdminDb();

  const {data:testBookings=[],error:be}=await db.from('bookings')
   .select('id,amount_pence,refunded_amount_pence,payment_status,stripe_payment_intent_id')
   .eq('customer_id',id).lte('amount_pence',100);
  if(be)throw be;

  let stripe=null;
  for(const b of (testBookings||[])){
   if(!['paid','part_refunded'].includes(b.payment_status))continue;
   const amount=Number(b.amount_pence||0),recorded=Number(b.refunded_amount_pence||0);
   const {data:ops=[],error:oe}=await db.from('refund_operations').select('amount_pence').eq('booking_id',b.id);
   if(oe)throw oe;
   const audited=(ops||[]).reduce((sum,x)=>sum+Number(x.amount_pence||0),0);
   let verified=Math.max(recorded,audited);

   // If our local audit rows did not catch the refund, verify it against Stripe.
   if(amount>0&&verified<amount&&b.stripe_payment_intent_id){
    stripe ||= getStripe();
    try{
     const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id,{expand:['latest_charge']});
     const charge=pi?.latest_charge;
     if(charge&&typeof charge==='object')verified=Math.max(verified,Number(charge.amount_refunded||0));
     else if(typeof charge==='string'){
      const ch=await stripe.charges.retrieve(charge);
      verified=Math.max(verified,Number(ch.amount_refunded||0));
     }
    }catch(err){
     console.warn('Could not verify Stripe refund for test booking',b.id,err?.message);
    }
   }

   if(amount>0&&verified>=amount){
    const {error:ue}=await db.from('bookings').update({
     payment_status:'refunded',refunded_amount_pence:verified,updated_at:new Date().toISOString()
    }).eq('id',b.id);
    if(ue)throw ue;
   }
  }

  const {data,error}=await db.rpc('delete_test_customer',{p_customer_id:id});
  if(error){
   const m=String(error.message||'');
   if(m.includes('customer_not_found'))return NextResponse.json({error:'This customer no longer exists.'},{status:404});
   if(m.includes('real_booking_exists'))return NextResponse.json({error:'This artist has a booking over £1, so they cannot be hard-deleted as test data.'},{status:409});
   if(m.includes('paid_test_booking_exists'))return NextResponse.json({error:'This test booking still appears paid. If you already refunded it, check the Stripe refund has completed, then try delete again.'},{status:409});
   throw error;
  }
  return NextResponse.json({ok:true,result:data});
 }catch(e){
  console.error('Delete test customer failed',e);
  return NextResponse.json({error:e.message||'Could not delete customer.'},{status:500});
 }
}
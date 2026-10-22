import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {getStripe} from '../../../../../lib/stripe';
export async function POST(req){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {paymentId,bookingId}=await req.json();if(!paymentId||!bookingId)return NextResponse.json({error:'Missing payment or booking.'},{status:400});
  const db=getAdminDb();
  const [{data:p,error:pe},{data:b,error:be}]=await Promise.all([db.from('studio_payments').select('*').eq('id',paymentId).single(),db.from('bookings').select('*').eq('id',bookingId).single()]);
  if(pe||be||!p||!b)return NextResponse.json({error:'Payment or booking not found.'},{status:404});
  if(!['session','other'].includes(p.kind)||p.status!=='paid'||p.booking_id||p.customer_id!==b.customer_id)return NextResponse.json({error:'Payment is ineligible or belongs to a different customer.'},{status:409});
  if(b.status==='cancelled'||['paid','refunded','part_refunded'].includes(b.payment_status))return NextResponse.json({error:'Booking already paid or cancelled.'},{status:409});
  // An invoice that was converted into a booking later can be reconciled by its owner.
  // Refuse an unrelated general invoice or an already linked booking to avoid crossing records.
  if(p.kind==='other'){
    if(!p.project_invoice_id && !p.invoice_id){
      const {data:project}=await db.from('project_invoices').select('id,status').eq('studio_payment_id',p.id).maybeSingle();
      if(!project||project.status!=='paid')return NextResponse.json({error:'This payment is not a verified paid invoice. It cannot be used to settle a later booking.'},{status:409});
    }
  }
  const {data:existingLinks=[]}=await db.from('studio_payments').select('id').eq('booking_id',b.id).eq('status','paid').neq('id',p.id).limit(1);
  if(existingLinks.length)return NextResponse.json({error:'This booking already has another paid transaction linked. Review accounting before reconciling.'},{status:409});
  const remaining=Math.max(0,Number(b.amount_pence||0)-Number(b.amount_paid_pence||0));
  if(Number(p.amount_pence||0)!==remaining||remaining<30)return NextResponse.json({error:'Payment amount does not equal the booking outstanding balance.'},{status:409});
  if(!p.stripe_checkout_session_id)return NextResponse.json({error:'No linked Stripe Checkout ID. Verify manually in Stripe; no automatic reconciliation performed.'},{status:409});
  const stripe=getStripe();const session=await stripe.checkout.sessions.retrieve(p.stripe_checkout_session_id);
  if(session.payment_status!=='paid'||session.metadata?.studio_payment_id!==p.id||session.currency!=='gbp'||Number(session.amount_total)!==Number(p.amount_pence))return NextResponse.json({error:'Stripe Checkout did not verify this payment and amount.'},{status:409});
  // Protect against mistaking a separately billed project for this studio session.
  // The owner makes an explicit, amount-exact match; Stripe checkout must refer to this payment row.
  const {data:claimed,error:claimError}=await db.from('studio_payments').update({booking_id:b.id}).eq('id',p.id).is('booking_id',null).eq('status','paid').select('id').maybeSingle();
  if(claimError)throw claimError;if(!claimed)return NextResponse.json({error:'Payment was already matched. Refresh the page.'},{status:409});
  const {data:updated,error:updateError}=await db.from('bookings').update({payment_status:'paid',payment_method:'stripe',amount_paid_pence:b.amount_pence,stripe_checkout_session_id:session.id,stripe_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:null,updated_at:new Date().toISOString()}).eq('id',b.id).eq('customer_id',p.customer_id).neq('payment_status','paid').select('id').maybeSingle();
  if(updateError||!updated){await db.from('studio_payments').update({booking_id:null}).eq('id',p.id).eq('booking_id',b.id);throw updateError||new Error('Booking changed while reconciling. Retry after reviewing it.');}
  return NextResponse.json({ok:true,bookingId:b.id});
 }catch(e){return NextResponse.json({error:e.message||'Could not reconcile payment.'},{status:500});}
}

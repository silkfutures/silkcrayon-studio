import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {getStripe} from '../../../../lib/stripe';

export async function POST(){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const db=getAdminDb(),stripe=getStripe();
  const {data:rows=[],error}=await db.from('bookings').select('id,stripe_checkout_session_id,payment_status,status').neq('payment_status','paid').not('stripe_checkout_session_id','is',null).limit(100);
  if(error)throw error;
  let checked=0,paid=0,updated=0;
  for(const b of rows){
    try{
      const session=await stripe.checkout.sessions.retrieve(b.stripe_checkout_session_id,{expand:['invoice']});checked++;
      const patch={stripe_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null,updated_at:new Date().toISOString()};
      if(session.invoice){const inv=typeof session.invoice==='string'?await stripe.invoices.retrieve(session.invoice):session.invoice;Object.assign(patch,{stripe_invoice_id:inv.id,stripe_invoice_number:inv.number||null,stripe_invoice_url:inv.hosted_invoice_url||null,stripe_invoice_pdf:inv.invoice_pdf||null})}
      if(session.payment_status==='paid'){patch.payment_status='paid';patch.status=b.status==='pending'?'confirmed':b.status;patch.hold_expires_at=null;paid++}
      const {error:ue}=await db.from('bookings').update(patch).eq('id',b.id);if(!ue)updated++;
    }catch{}
  }
  return NextResponse.json({ok:true,checked,paid,updated});
 }catch(e){return NextResponse.json({error:e.message||'Sync failed.'},{status:500})}
}
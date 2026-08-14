import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
export async function DELETE(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,db=getAdminDb();

  // Reconcile fully-refunded test bookings before calling the hard-delete RPC.
  // This fixes the case where refund audit data is complete but payment_status
  // is still stuck on paid/part_refunded.
  const {data:testBookings=[],error:be}=await db.from('bookings')
    .select('id,amount_pence,refunded_amount_pence,payment_status')
    .eq('customer_id',id)
    .lte('amount_pence',100);
  if(be)throw be;

  for(const b of testBookings){
    if(!['paid','part_refunded'].includes(b.payment_status))continue;
    const amount=Number(b.amount_pence||0);
    const recorded=Number(b.refunded_amount_pence||0);
    const {data:ops=[],error:oe}=await db.from('refund_operations')
      .select('amount_pence')
      .eq('booking_id',b.id);
    if(oe)throw oe;
    const audited=(ops||[]).reduce((sum,x)=>sum+Number(x.amount_pence||0),0);
    if(amount>0 && Math.max(recorded,audited)>=amount){
      const {error:ue}=await db.from('bookings').update({
        payment_status:'refunded',
        refunded_amount_pence:Math.max(recorded,audited),
        updated_at:new Date().toISOString()
      }).eq('id',b.id);
      if(ue)throw ue;
    }
  }

  const {data,error}=await db.rpc('delete_test_customer',{p_customer_id:id});
  if(error){
    const m=String(error.message||'');
    if(m.includes('customer_not_found'))return NextResponse.json({error:'This customer no longer exists.'},{status:404});
    if(m.includes('real_booking_exists'))return NextResponse.json({error:'This artist has a booking over £1, so they cannot be hard-deleted as test data.'},{status:409});
    if(m.includes('paid_test_booking_exists'))return NextResponse.json({error:'Refund the paid test booking first, then delete the artist.'},{status:409});
    throw error;
  }
  return NextResponse.json({ok:true,result:data});
 }catch(e){console.error('Delete test customer failed',e);return NextResponse.json({error:e.message||'Could not delete customer.'},{status:500})}
}

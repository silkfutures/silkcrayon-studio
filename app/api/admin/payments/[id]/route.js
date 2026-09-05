import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';

export async function DELETE(_req,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx)return NextResponse.json({error:'Staff access required.'},{status:403});
  const {id}=await params;const db=getAdminDb();
  const {data:p,error}=await db.from('studio_payments').select('id,status,paid_at,stripe_payment_intent_id').eq('id',id).maybeSingle();
  if(error)throw error;if(!p)return NextResponse.json({error:'Payment not found.'},{status:404});
  if(!['pending','expired','cancelled'].includes(p.status)||p.paid_at||p.stripe_payment_intent_id)return NextResponse.json({error:'Completed payments cannot be deleted. Refund or correct the payment instead.'},{status:409});
  await db.from('credit_ledger').delete().eq('payment_id',id);
  const {error:de}=await db.from('studio_payments').delete().eq('id',id);if(de)throw de;
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e.message||'Could not delete payment.'},{status:500})}
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
export async function DELETE(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,db=getAdminDb();
  const {data:bookings=[],error}=await db.from('bookings').select('id,amount_pence,payment_status').eq('customer_id',id);if(error)throw error;
  if(bookings.some(b=>Number(b.amount_pence||0)>100))return NextResponse.json({error:'This customer has real bookings. Test-customer deletion is only available when every booking is £1 or less.'},{status:409});
  if(bookings.some(b=>['paid','part_refunded'].includes(b.payment_status)))return NextResponse.json({error:'Refund any paid test bookings before deleting this customer.'},{status:409});
  if(bookings.length){const {error:be}=await db.from('bookings').delete().eq('customer_id',id);if(be)throw be;}
  const {error:ce}=await db.from('customers').delete().eq('id',id);if(ce)throw ce;
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e.message||'Could not delete customer.'},{status:500})}
}
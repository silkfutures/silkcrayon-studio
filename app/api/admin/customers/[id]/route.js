import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
export async function DELETE(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,db=getAdminDb();
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

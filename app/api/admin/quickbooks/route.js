import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
// Tidy the payment status of an archived QuickBooks invoice: { id, status: 'paid'|'unpaid'|'unrecorded'|'void' }
export async function PATCH(req){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  const b=await req.json().catch(()=>({}));
  if(!['paid','unpaid','unrecorded','void'].includes(b.status))return NextResponse.json({error:'Invalid status.'},{status:400});
  const {data,error}=await getAdminDb().from('quickbooks_invoices').update({status:b.status,status_updated_at:new Date().toISOString()}).eq('id',String(b.id||'')).eq('txn_type','Invoice').select('id').maybeSingle();
  if(error)throw error;if(!data)return NextResponse.json({error:'Invoice not found.'},{status:404});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Could not update.'},{status:500});}
}

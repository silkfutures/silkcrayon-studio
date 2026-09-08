import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../../lib/supabase';
import {sendLegacyCreditEmail} from '../../../../../../../lib/legacyCreditEmail';
export async function POST(req,{params}){
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const {id}=await params,db=getAdminDb();
 const [{data:customer,error:ce},{data:entry,error:ee}]=await Promise.all([
  db.from('customers').select('id,full_name,artist_name,email').eq('id',id).single(),
  db.from('credit_ledger').select('id,hours_delta').eq('customer_id',id).not('external_reference','is',null).gt('hours_delta',0).order('created_at',{ascending:false}).limit(1).maybeSingle()
 ]);
 if(ce||ee)return NextResponse.json({error:'Could not verify the customer and credit.'},{status:500});
 if(!entry)return NextResponse.json({error:'No imported voucher credit found for this artist.'},{status:404});
 const result=await sendLegacyCreditEmail(customer,entry);
 return NextResponse.json({ok:result.ok,message:result.logWarning||(result.ok?'Email accepted by provider. Logged in Automations.':result.error)},{status:result.ok?200:502});
}

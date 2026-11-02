import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
export async function POST(req){
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});
 try{const b=await req.json();if(!Number.isSafeInteger(b.amountPence)||!Array.isArray(b.items)||!b.items.length||b.items.length>100)return NextResponse.json({error:'Choose the jobs covered by this payment.'},{status:400});
 const {data,error}=await getAdminDb().rpc('record_engineer_payment_batch',{p_engineer:b.engineerId,p_reference:b.reference,p_paid_on:b.paidOn,p_amount:b.amountPence,p_items:b.items.map(x=>({type:x.type,id:x.id})),p_actor:ctx.user.id});
 if(error)return NextResponse.json({error:error.message},{status:409});return NextResponse.json({ok:true,id:data});
 }catch{return NextResponse.json({error:'Could not record payment. Refresh the tab and check the payment history before retrying.'},{status:500});}
}

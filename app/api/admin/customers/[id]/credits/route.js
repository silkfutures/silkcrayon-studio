import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {sendLegacyCreditEmail} from '../../../../../../lib/legacyCreditEmail';

export async function POST(req,{params}){try{
 const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const {id}=await params,body=await req.json(),hours=Number(body.hours),amountPence=Math.round(Number(body.amountPaid||0)*100),reference=String(body.reference||'').trim().slice(0,120),note=String(body.note||'').trim().slice(0,300);
 if(!Number.isFinite(hours)||hours<=0||hours>100)return NextResponse.json({error:'Enter between 0.5 and 100 studio hours.'},{status:400});
 if(Math.round(hours*2)!==hours*2)return NextResponse.json({error:'Credit can be entered in half-hour steps.'},{status:400});
 if(!Number.isFinite(amountPence)||amountPence<0)return NextResponse.json({error:'Enter the amount originally paid.'},{status:400});
 if(!reference)return NextResponse.json({error:'Add the old order or voucher reference.'},{status:400});
 const db=getAdminDb(),{data:customer,error:customerError}=await db.from('customers').select('id,full_name,artist_name,email').eq('id',id).single();if(customerError||!customer)return NextResponse.json({error:'Artist not found.'},{status:404});
 const ledgerNote=[`Previous-system credit · £${(amountPence/100).toFixed(2)} paid`,reference,note].filter(Boolean).join(' · ');
 const {data:entry,error}=await db.from('credit_ledger').insert({customer_id:id,hours_delta:hours,note:ledgerNote,created_by_user_id:ctx.user.id,external_reference:reference,legacy_amount_pence:amountPence}).select('id').single();
 if(error){if(String(error.message||'').toLowerCase().includes('duplicate'))return NextResponse.json({error:'That old-system reference has already been imported.'},{status:409});throw error}
 const emailResult=await sendLegacyCreditEmail(customer,{id:entry.id,hours_delta:hours});
 const {data:credits=[]}=await db.from('credit_ledger').select('hours_delta').eq('customer_id',id),balance=credits.reduce((sum,x)=>sum+Number(x.hours_delta||0),0);
 return NextResponse.json({ok:true,entryId:entry.id,balance,emailSent:!!emailResult.ok,emailWarning:emailResult.logWarning||(!emailResult.ok?emailResult.error:null)});
}catch(e){return NextResponse.json({error:e.message||'Could not add the credit.'},{status:500})}}

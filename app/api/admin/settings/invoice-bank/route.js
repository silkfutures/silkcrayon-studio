import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {validateBank} from '../../../../../lib/projectInvoiceRules';
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  const b=await req.json().catch(()=>({}));const v=validateBank(b);if(!v.ok)return NextResponse.json({error:v.error},{status:400});
  const days=Math.round(Number(b.termsDays));if(!Number.isFinite(days)||days<0||days>90)return NextResponse.json({error:'Payment terms must be 0–90 days.'},{status:400});
  const at=new Date().toISOString();
  const {error}=await getAdminDb().from('studio_settings').upsert([{key:'invoice_bank_account_name',value:v.empty?'':v.name,updated_at:at},{key:'invoice_bank_sort_code',value:v.empty?'':v.sort,updated_at:at},{key:'invoice_bank_account_number',value:v.empty?'':v.acc,updated_at:at},{key:'invoice_payment_terms_days',value:String(days),updated_at:at}],{onConflict:'key'});
  if(error)throw error;return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e.message||'Could not save.'},{status:500});}
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';

const pence=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Math.round(Number(v)*100);if(!Number.isFinite(n)||n<0||n>100000)throw new Error('Enter an hourly pay rate between £0 and £1,000.');return n;};

// Engineer pay is separate from customer pricing. Changes apply to new offers/assignments; accepted sessions keep their agreed fee.
export async function PATCH(req,{params}){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});
  const {id}=await params,b=await req.json().catch(()=>({}));
  let pay,supported;try{pay=pence(b.payHourly);supported=pence(b.supportedPayHourly);}catch(e){return NextResponse.json({error:e.message},{status:400});}
  const {data,error}=await getAdminDb().from('staff_profiles').update({engineer_pay_hourly_pence:pay,engineer_supported_pay_hourly_pence:supported,updated_at:new Date().toISOString()}).eq('user_id',id).select('user_id').maybeSingle();
  if(error)throw error;if(!data)return NextResponse.json({error:'Engineer not found.'},{status:404});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Could not save the pay rate. Check that the v20.12.42 migration has been applied.'},{status:500});}
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
// Continue invoice numbering from QuickBooks: { next: 1155 }
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  const b=await req.json().catch(()=>({}));const next=Math.round(Number(b.next));
  if(!Number.isFinite(next)||next<1||next>999999999)return NextResponse.json({error:'Enter a whole number.'},{status:400});
  const {error}=await getAdminDb().rpc('set_next_invoice_number',{p_next:next});
  if(error){const m=String(error.message||'').match(/number_in_use:(\d+)/);return NextResponse.json({error:m?`Number ${m[1]} has already been used — the next number must be ${Number(m[1])+1} or higher.`:'Could not set numbering. Check the v20-12-51 migration has been applied.'},{status:400});}
  return NextResponse.json({ok:true,next});
 }catch{return NextResponse.json({error:'Could not set numbering.'},{status:500});}
}

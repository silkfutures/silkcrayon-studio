import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {createProjectInvoice,resendProjectInvoice,markProjectInvoicePaid,voidProjectInvoice} from '../../../../../../lib/projectInvoices';

function guard(req,ctx){if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});return null;}

// Send a new invoice: { stage: 'deposit'|'full'|'balance'|'custom', percent?, amount? (pounds), description?, dueDate? }
export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
  const {id}=await params,b=await req.json().catch(()=>({}));
  const r=await createProjectInvoice(getAdminDb(),{projectId:id,stage:b.stage,percent:b.percent,amountPence:b.amount==null||b.amount===''?null:Math.round(Number(b.amount)*100),description:b.description,dueDate:b.dueDate,ctx});
  return NextResponse.json(r,{status:r.ok?200:r.status||400});
 }catch(e){console.error('Project invoice failed',e);return NextResponse.json({error:'Could not create the invoice. Check that the v20.12.48 migration has been applied.'},{status:500});}
}
// { invoiceId, action: 'resend'|'mark_paid'|'void', method?, note? }
export async function PATCH(req,{params}){
 try{
  const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
  const {id}=await params,b=await req.json().catch(()=>({})),db=getAdminDb();
  const {data:inv}=await db.from('project_invoices').select('id,project_id').eq('id',String(b.invoiceId||'')).maybeSingle();
  if(!inv||inv.project_id!==id)return NextResponse.json({error:'Invoice not found.'},{status:404});
  let r;
  if(b.action==='resend')r=await resendProjectInvoice(db,{invoiceId:inv.id});
  else if(b.action==='mark_paid')r=await markProjectInvoicePaid(db,{invoiceId:inv.id,method:b.method,note:b.note,ctx});
  else if(b.action==='void')r=await voidProjectInvoice(db,{invoiceId:inv.id});
  else return NextResponse.json({error:'Unknown action.'},{status:400});
  return NextResponse.json(r,{status:r.ok?200:409});
 }catch(e){console.error('Project invoice update failed',e);return NextResponse.json({error:'Could not update the invoice.'},{status:500});}
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {saveDraft,sendInvoice,billableForCustomer} from '../../../../lib/invoices';

function guard(req,ctx){if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});if(req.method!=='GET'&&(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)))return NextResponse.json({error:'Invalid origin.'},{status:403});return null;}

// Unpaid sessions for a customer that can go on an invoice: GET ?customerId=
export async function GET(req){
 const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
 try{const id=new URL(req.url).searchParams.get('customerId');return NextResponse.json(await billableForCustomer(getAdminDb(),id));}
 catch{return NextResponse.json({error:'Could not load sessions. Check the v20.12.52 migration.'},{status:500});}
}
// Create: { ...invoice, send?: true }
export async function POST(req){
 const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
 try{
  const b=await req.json().catch(()=>({})),db=getAdminDb();
  const saved=await saveDraft(db,{input:b,ctx});if(!saved.ok)return NextResponse.json(saved,{status:saved.status||400});
  if(!b.send)return NextResponse.json({ok:true,id:saved.invoice.id,status:'draft'});
  const sent=await sendInvoice(db,{id:saved.invoice.id});
  return NextResponse.json({...sent,id:saved.invoice.id},{status:sent.ok?200:sent.status||400});
 }catch(e){console.error('Invoice create failed',e);return NextResponse.json({error:'Could not save the invoice. Check the v20.12.52 migration has been applied.'},{status:500});}
}

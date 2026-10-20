import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {duplicateInvoice} from '../../../../../lib/invoices';
// { fromInvoiceId } or { fromQuickbooksId } → new draft
export async function POST(req){
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
 try{const b=await req.json().catch(()=>({}));const r=await duplicateInvoice(getAdminDb(),{fromInvoiceId:b.fromInvoiceId||null,fromQuickbooksId:b.fromQuickbooksId||null,ctx});
  return NextResponse.json(r.ok?{ok:true,id:r.invoice.id}:r,{status:r.ok?200:r.status||400});}
 catch(e){console.error('Duplicate invoice failed',e);return NextResponse.json({error:'Could not duplicate the invoice.'},{status:500});}
}

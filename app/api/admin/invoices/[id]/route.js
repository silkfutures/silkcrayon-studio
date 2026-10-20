import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {saveDraft,sendInvoice,resendInvoice,markInvoicePaid,voidInvoice,deleteDraft} from '../../../../../lib/invoices';

function guard(req,ctx){if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});return null;}

// { action: 'save'|'send'|'resend'|'mark_paid'|'void', invoice?, method?, note? }
export async function PATCH(req,{params}){
 const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
 try{
  const {id}=await params,b=await req.json().catch(()=>({})),db=getAdminDb();let r;
  if(b.action==='save'||b.action==='save_send'){r=await saveDraft(db,{id,input:b.invoice||{},ctx});if(r.ok&&b.action==='save_send')r=await sendInvoice(db,{id});}
  else if(b.action==='send')r=await sendInvoice(db,{id});
  else if(b.action==='resend')r=await resendInvoice(db,{id});
  else if(b.action==='mark_paid')r=await markInvoicePaid(db,{id,method:b.method,note:b.note,ctx});
  else if(b.action==='void')r=await voidInvoice(db,{id});
  else return NextResponse.json({error:'Unknown action.'},{status:400});
  return NextResponse.json(r,{status:r.ok?200:r.status||409});
 }catch(e){console.error('Invoice update failed',e);return NextResponse.json({error:'Could not update the invoice.'},{status:500});}
}
export async function DELETE(req,{params}){
 const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
 const {id}=await params;const r=await deleteDraft(getAdminDb(),{id});return NextResponse.json(r,{status:r.ok?200:409});
}

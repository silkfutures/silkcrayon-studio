import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {approvePayout,cancelPayout,markPaidOutsideStripe} from '../../../../../lib/engineerPayouts';

// Owner exceptions only: { action: 'approve' | 'retry' | 'mark_paid_outside' | 'cancel', amount?: pounds, note? }
export async function PATCH(req,{params}){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});
  const {id}=await params,b=await req.json().catch(()=>({})),db=getAdminDb();
  if(b.action==='approve'||b.action==='retry'){
   const amountPence=b.amount===undefined||b.amount===null||b.amount===''?null:Math.round(Number(b.amount)*100);
   const r=await approvePayout(db,{id,amountPence,ctx});
   return NextResponse.json(r,{status:r.ok?200:409});
  }
  if(b.action==='mark_paid_outside'){const amountPence=b.amount===undefined||b.amount===null||b.amount===''?null:Math.round(Number(b.amount)*100);const r=await markPaidOutsideStripe(db,{id,amountPence,note:b.note,ctx});return NextResponse.json(r,{status:r.ok?200:409});}
  if(b.action==='cancel'){const r=await cancelPayout(db,{id});return NextResponse.json(r,{status:r.ok?200:409});}
  return NextResponse.json({error:'Unknown action.'},{status:400});
 }catch(e){console.error('Payout update failed',e);return NextResponse.json({error:'Could not update the payout.'},{status:500});}
}

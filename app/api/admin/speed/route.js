import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {loadReceiptRows} from '../../../../lib/receiptData';
export const dynamic='force-dynamic';
// Owner speed check: open /api/admin/speed and send the result. Times are in milliseconds.
export async function GET(){
 const t=()=>performance.now(),out={region:process.env.VERCEL_REGION||'unknown',steps:{}};
 let a=t();const ctx=await getStaffContext();out.steps.signInCheck=Math.round(t()-a);
 if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const db=getAdminDb();
 a=t();await db.from('studio_settings').select('key').limit(1);out.steps.databaseRoundTrip=Math.round(t()-a);
 a=t();await db.from('studio_settings').select('key').limit(1);out.steps.databaseRoundTripWarm=Math.round(t()-a);
 a=t();const {count:b}=await db.from('bookings').select('id',{count:'exact',head:true});const {count:p}=await db.from('studio_payments').select('id',{count:'exact',head:true});const {count:v}=await db.from('page_views').select('id',{count:'exact',head:true});out.steps.counts=Math.round(t()-a);out.rows={bookings:b,studioPayments:p,pageViews:v};
 a=t();try{const r=await loadReceiptRows(db);out.rows.receipts=r.length;}catch(e){out.receiptsError=e.message;}out.steps.fullPaymentHistory=Math.round(t()-a);
 out.supabaseHost=(()=>{try{return new URL(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL).host.split('.')[0].slice(0,6)+'…';}catch{return 'unknown';}})();
 return NextResponse.json(out,{headers:{'Cache-Control':'no-store'}});
}

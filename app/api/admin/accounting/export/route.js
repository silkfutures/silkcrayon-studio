import {NextResponse} from 'next/server';
import {requireOwner} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {loadReceiptRows} from '../../../../../lib/receiptData';
function quote(value){let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export async function GET(){
 await requireOwner();
 try{
  const receipts=await loadReceiptRows(getAdminDb());
  const rows=[['Date','Type','Customer','Email','Description','Gross GBP','Refund GBP','Net GBP','Payment status','Stripe invoice number','Stripe invoice URL','Stripe payment intent','Date estimated'],...receipts.map(x=>[x.date?String(x.date).slice(0,10):'',x.kind,x.name,x.email,x.description,(x.amount/100).toFixed(2),(x.refund/100).toFixed(2),((x.amount-x.refund)/100).toFixed(2),x.status,x.number,x.invoice,x.paymentIntent,x.dateEstimated?'Yes':'No'])];
  return new NextResponse(rows.map(row=>row.map(quote).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="silkcrayon-accounting.csv"'}});
 }catch{return NextResponse.json({error:'Could not load accounting. Please retry.'},{status:503})}
}

import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {startCardPayment} from '../../../../lib/projectInvoices';

// Public: the secret token in the customer's invoice email is the credential.
export async function POST(req,{params}){
 try{
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid request.'},{status:403});
  const {token}=await params;
  const r=await startCardPayment(getAdminDb(),{token});
  return NextResponse.json(r,{status:r.ok?200:r.status||400});
 }catch(e){console.error('Invoice checkout failed',e?.message||e);return NextResponse.json({error:'Card payment is unavailable right now. Please try again shortly or pay by bank transfer.'},{status:500});}
}

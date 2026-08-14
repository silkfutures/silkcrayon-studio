import {NextResponse} from 'next/server';import {getAdminDb} from '../../../../lib/supabase';import {normalizePhone,validateTwilioSignature} from '../../../../lib/sms';
export async function POST(req){
 const raw=await req.text(),params=Object.fromEntries(new URLSearchParams(raw)),sig=req.headers.get('x-twilio-signature')||'',base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin,url=`${base}/api/twilio/inbound`;
 if(process.env.TWILIO_VALIDATE_WEBHOOKS!=='false'&&!validateTwilioSignature({signature:sig,url,params}))return new NextResponse('Forbidden',{status:403});
 const phone=normalizePhone(params.From),type=String(params.OptOutType||'').toUpperCase(),db=getAdminDb();
 if(phone&&['STOP','START'].includes(type)){
   const {data:contacts=[]}=await db.from('crm_contacts').select('id,phone').not('phone','is',null);
   const ids=contacts.filter(c=>normalizePhone(c.phone)===phone).map(c=>c.id);
   if(ids.length)await db.from('crm_contacts').update({sms_marketing_status:type==='STOP'?'unsubscribed':'subscribed',sms_marketing_consent:type==='START',updated_at:new Date().toISOString()}).in('id',ids);
   const {data:customers=[]}=await db.from('customers').select('id,phone').not('phone','is',null);
   const customerIds=customers.filter(c=>normalizePhone(c.phone)===phone).map(c=>c.id);
   if(customerIds.length)await db.from('customers').update({sms_marketing_consent:type==='START'}).in('id',customerIds);
 }
 return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>',{headers:{'Content-Type':'text/xml'}});
}

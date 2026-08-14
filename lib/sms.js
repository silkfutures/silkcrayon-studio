import crypto from 'crypto';
import {getAdminDb} from './supabase';

export function normalizePhone(input){
 let s=String(input||'').trim().replace(/[()\s-]/g,'');
 if(!s)return null;
 if(s.startsWith('0044'))s='+'+s.slice(2);
 else if(s.startsWith('07'))s='+44'+s.slice(1);
 else if(!s.startsWith('+')&&/^7\d{9}$/.test(s))s='+44'+s;
 return /^\+\d{8,15}$/.test(s)?s:null;
}
function config(){const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN,service=process.env.TWILIO_MESSAGING_SERVICE_SID,from=process.env.TWILIO_FROM_NUMBER;if(!sid||!token||(!service&&!from))return null;return {sid,token,service,from}}
export async function sendSms({to,body,marketing=false}){
 const c=config(),phone=normalizePhone(to);if(!c)return {ok:false,skipped:true,error:'Twilio is not configured'};if(!phone)return {ok:false,skipped:true,error:'Invalid phone number'};
 let text=String(body||'').trim();if(marketing&&!/reply\s+stop/i.test(text))text=`${text}\n\nReply STOP to opt out.`;
 const form=new URLSearchParams({To:phone,Body:text});if(c.service)form.set('MessagingServiceSid',c.service);else form.set('From',c.from);
 const auth=Buffer.from(`${c.sid}:${c.token}`).toString('base64');
 const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.sid}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});
 const data=await r.json().catch(()=>({}));if(!r.ok)return {ok:false,error:data?.message||`Twilio returned ${r.status}`,code:data?.code};
 return {ok:true,id:data.sid,status:data.status,to:phone};
}
export async function sendLoggedSms({booking,customer,type,body,marketing=false}){
 const db=getAdminDb(),recipient=normalizePhone(customer?.phone);if(!booking?.id||!recipient)return {ok:false,skipped:true};
 const {data:existing}=await db.from('notification_log').select('id,status').eq('booking_id',booking.id).eq('notification_type',type).eq('recipient',recipient).maybeSingle();
 if(existing?.status==='sent')return {ok:true,duplicate:true};let logId=existing?.id;
 if(!logId){const {data,error}=await db.from('notification_log').insert({booking_id:booking.id,customer_id:customer.id,notification_type:type,recipient,subject:body.slice(0,80),status:'queued'}).select('id').single();if(error)throw error;logId=data.id}
 const result=await sendSms({to:recipient,body,marketing});
 await db.from('notification_log').update({status:result.ok?'sent':result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',logId);
 return result;
}
export function validateTwilioSignature({signature,url,params}){
 const token=process.env.TWILIO_AUTH_TOKEN;if(!token||!signature)return false;let data=url;for(const key of Object.keys(params).sort())data+=key+params[key];
 const expected=crypto.createHmac('sha1',token).update(data,'utf8').digest('base64');
 try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature))}catch{return false}
}

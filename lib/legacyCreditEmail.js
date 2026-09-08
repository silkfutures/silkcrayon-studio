import {getAdminDb} from './supabase';
import {sendEmail} from './notifications';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Each deliberate send is an attempt, not a new credit. Do not deduplicate
// unrelated vouchers using a null booking ID.
export async function sendLegacyCreditEmail(customer,entry){
 const db=getAdminDb(),subject='Your Silkcrayon voucher credit is ready';
 let logId;
 try{
  const {data,error}=await db.from('notification_log').insert({customer_id:customer.id,booking_id:null,notification_type:'package_purchase',recipient:customer.email,subject,status:'queued'}).select('id').single();
  if(error)throw error;logId=data.id;
 }catch{return {ok:false,error:'Credit saved, but the email log could not be created. No email was attempted.'};}
 let result;
 try{
  result=await sendEmail({to:customer.email,subject,html:`<html><body style="margin:0;background:#08070a;color:#fff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:32px 24px"><p style="color:#c394ff">SILKCRAYON STUDIOS</p><h1>Your studio hours are ready.</h1><p style="font-size:16px;line-height:1.7">Hi ${esc(customer.artist_name||customer.full_name)}, your previous Silkcrayon voucher has been transferred to your account as <b>${esc(entry.hours_delta)} studio hours</b>. This is an existing-credit transfer, not a new payment.</p><p>Sign in using <b>${esc(customer.email)}</b> to see your current balance and book with your hours.</p><p><a href="https://silkcrayon.com/account/login" style="display:inline-block;background:#c394ff;color:#08070a;padding:14px 20px;text-decoration:none;font-weight:bold">OPEN MY STUDIO</a></p></div></body></html>`});
 }catch{result={ok:false,error:'Email provider request failed. Check the provider before retrying.'};}
 const {error}=await db.from('notification_log').update({status:result.ok?'sent':result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',logId);
 return {...result,logWarning:error?'Email result could not be saved to Automations. Check the email provider before retrying.':null};
}

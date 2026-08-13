import { getAdminDb } from './supabase';

function siteUrl(){ return process.env.NEXT_PUBLIC_SITE_URL || 'https://silkcrayon-studio.vercel.app'; }
function fromAddress(){ return process.env.EMAIL_FROM || 'Silkcrayon Studio <bookings@silkcrayon.com>'; }
function escapeHtml(v=''){return String(v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function shell(title,body,cta){return `<!doctype html><html><body style="margin:0;background:#08070a;color:#f7f3fa;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:42px 22px"><div style="color:#C394FF;font-size:12px;letter-spacing:3px;font-weight:700">SILKCRAYON STUDIO</div><h1 style="font-size:34px;line-height:1;margin:18px 0">${title}</h1><div style="color:#c8c1cc;font-size:16px;line-height:1.7">${body}</div>${cta?`<p style="margin-top:30px"><a href="${cta.href}" style="background:#C394FF;color:#0b0710;padding:14px 20px;text-decoration:none;font-weight:800;display:inline-block">${cta.label}</a></p>`:''}<p style="border-top:1px solid #302b35;margin-top:36px;padding-top:20px;color:#8f8894;font-size:12px">Cardiff Bay · Silkcrayon Studio</p></div></body></html>`}

export async function sendEmail({to,subject,html}){
 const key=process.env.RESEND_API_KEY;
 if(!key) return {ok:false,skipped:true,error:'RESEND_API_KEY is not configured'};
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:fromAddress(),to:[to],subject,html})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) return {ok:false,error:data?.message||`Email provider returned ${r.status}`};
 return {ok:true,id:data.id};
}

export async function sendLoggedNotification({booking,customer,type,subject,html}){
 const db=getAdminDb(); const recipient=customer?.email;
 if(!booking?.id||!recipient)return {ok:false,skipped:true};
 const {data:existing}=await db.from('notification_log').select('id,status').eq('booking_id',booking.id).eq('notification_type',type).eq('recipient',recipient).maybeSingle();
 if(existing?.status==='sent')return {ok:true,duplicate:true};
 let logId=existing?.id;
 if(!logId){const {data}=await db.from('notification_log').insert({booking_id:booking.id,customer_id:customer.id,notification_type:type,recipient,subject,status:'queued'}).select('id').single();logId=data?.id;}
 const result=await sendEmail({to:recipient,subject,html});
 await db.from('notification_log').update({status:result.ok?'sent':result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',logId);
 return result;
}

export function confirmationEmail(b,c){const artist=escapeHtml(c.artist_name||c.full_name);return {subject:`Booking confirmed — ${b.booking_date} at ${String(b.start_time).slice(0,5)}`,html:shell('You’re booked.',`<p>Hi ${artist}, your Silkcrayon session is confirmed.</p><p><b>${escapeHtml(b.service_name)}</b><br>${b.booking_date}<br>${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}</p><p>Your music and session files are treated with care. We’ll see you in the studio.</p>`,{label:'VIEW SILKCRAYON',href:siteUrl()})}}
export function reminderEmail(b,c){const artist=escapeHtml(c.artist_name||c.full_name);return {subject:`Your Silkcrayon session is tomorrow at ${String(b.start_time).slice(0,5)}`,html:shell('See you tomorrow.',`<p>Hi ${artist}, a quick reminder that your session is tomorrow.</p><p><b>${escapeHtml(b.service_name)}</b><br>${b.booking_date}<br>${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}</p><p>Bring anything you need for the session and arrive ready to create.</p>`)}}
export function bookAgainEmail(b,c){const artist=escapeHtml(c.artist_name||c.full_name);return {subject:'Ready for the next session?',html:shell('Keep the momentum.',`<p>Hi ${artist}, thanks for creating with us.</p><p>If you want to keep building the record while it’s fresh, you can book your next Silkcrayon session below.</p>`,{label:'BOOK NEXT SESSION',href:`${siteUrl()}/booking`})}}

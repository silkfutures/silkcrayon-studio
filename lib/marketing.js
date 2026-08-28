import {getAdminDb} from './supabase';
const API='https://api.resend.com';
function headers(){const key=process.env.RESEND_API_KEY;if(!key)throw new Error('RESEND_API_KEY is not configured.');return {Authorization:`Bearer ${key}`,'Content-Type':'application/json'};}
async function rr(path,options={}){const r=await fetch(`${API}${path}`,{...options,headers:{...headers(),...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data?.message||`Resend returned ${r.status}`);e.status=r.status;throw e}return data;}
const AUDIENCES={
 subscribers:{name:'Silkcrayon · Email subscribers'},
 previous_customers:{name:'Silkcrayon · Previous customers · subscribed'}
};
function audienceDef(key='subscribers'){const def=AUDIENCES[key];if(!def)throw new Error('That audience is not available for marketing sends.');return def;}
export async function ensureMarketingSegment(audienceKey='subscribers'){
 const def=audienceDef(audienceKey),db=getAdminDb(),settingKey=`resend_segment_${audienceKey}`;
 const {data:stored}=await db.from('marketing_settings').select('value').eq('key',settingKey).maybeSingle();if(stored?.value)return stored.value;
 const list=await rr('/segments');let seg=(list.data||[]).find(x=>x.name===def.name);
 if(!seg)seg=await rr('/segments',{method:'POST',body:JSON.stringify({name:def.name})});
 await db.from('marketing_settings').upsert({key:settingKey,value:seg.id,updated_at:new Date().toISOString()});return seg.id;
}
async function eligibleContacts(audienceKey='subscribers'){
 const db=getAdminDb();
 let q=db.from('crm_contacts').select('*').eq('marketing_status','subscribed').eq('marketing_consent',true).not('email','is',null).order('created_at');
 const {data:contacts=[],error}=await q;if(error)throw error;
 if(audienceKey==='subscribers')return contacts;
 if(audienceKey==='previous_customers'){
  const ids=[...new Set(contacts.map(c=>c.customer_id).filter(Boolean))];if(!ids.length)return [];
  const {data:bookings=[],error:be}=await db.from('bookings').select('customer_id').in('customer_id',ids);if(be)throw be;
  const booked=new Set(bookings.map(b=>b.customer_id));return contacts.filter(c=>c.customer_id&&booked.has(c.customer_id));
 }
 throw new Error('That audience is not available for marketing sends.');
}
export async function syncEligibleContacts(audienceKey='subscribers'){
 const db=getAdminDb(),segmentId=await ensureMarketingSegment(audienceKey),contacts=await eligibleContacts(audienceKey);
 let created=0,existing=0,failed=0;
 for(const c of contacts){try{
  const body={email:c.email,first_name:c.first_name||undefined,last_name:c.last_name||undefined,unsubscribed:false,segments:[{id:segmentId}]};
  const made=await rr('/contacts',{method:'POST',body:JSON.stringify(body)});created++;
  if(made?.id)await db.from('crm_contacts').update({resend_contact_id:made.id,updated_at:new Date().toISOString()}).eq('id',c.id);
 }catch(e){if(e.status===409){existing++;try{await rr(`/contacts/${encodeURIComponent(c.email)}/segments/${segmentId}`,{method:'POST'});}catch{}}else failed++;}}
 return {segmentId,audienceKey,eligible:contacts.length,created,existing,failed};
}
function esc(v=''){return String(v).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function paras(body=''){return esc(body).split(/\n{2,}/).map(x=>`<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#cbc4cf">${x.replace(/\n/g,'<br>')}</p>`).join('');}
function shell({preheader='',content='',imageUrl='',imageAlt=''}){const hero=imageUrl?`<img src="${esc(imageUrl)}" alt="${esc(imageAlt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0" />`:'';return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#08070a;-webkit-text-size-adjust:100%;word-spacing:normal"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:#08070a"><tr><td align="center" style="padding:20px 10px 36px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;table-layout:fixed"><tr><td style="padding:18px 10px 24px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.4;letter-spacing:3px;color:#c394ff;font-weight:800">SILKCRAYON STUDIOS · CARDIFF BAY</td></tr><tr><td style="border:1px solid #382c44;background:#0b0910;font-family:Arial,Helvetica,sans-serif;overflow-wrap:anywhere;word-break:break-word">${hero}${content}</td></tr><tr><td style="padding:18px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#746d78;font-size:10px;line-height:1.6">Silkcrayon Studios · Cardiff Bay<br>You’re receiving this because you opted in to Silkcrayon updates.<br><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#bda3db">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`;}
function button(label,url){if(!label||!url)return'';return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:26px 0"><tr><td bgcolor="#c394ff" style="background:#c394ff"><a href="${esc(url)}" style="display:block;padding:15px 20px;color:#09060c;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.2;font-weight:900;letter-spacing:.5px">${esc(label)} →</a></td></tr></table>`;}

export function broadcastHtml({preheader='',headline,body,ctaLabel,ctaUrl,imageUrl='',imageAlt=''}){
 return shell({preheader,imageUrl,imageAlt,content:`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse"><tr><td style="padding:34px 28px"><div style="font-size:10px;letter-spacing:2px;color:#c394ff;font-weight:800">FROM THE STUDIO</div><h1 style="font-size:36px;line-height:1.05;color:#fff;margin:14px 0 22px;letter-spacing:-1px">${esc(headline)}</h1><p style="margin:0 0 18px;color:#fff;font-size:15px">Hi {{{contact.first_name|there}}},</p>${paras(body)}${button(ctaLabel,ctaUrl)}</td></tr></table>`});
}
export function paydayRelaunchHtml({preheader='',headline="We're back.",body,ctaLabel,ctaUrl,imageUrl='',imageAlt=''}){
 return shell({preheader,imageUrl,imageAlt,content:`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse"><tr><td align="center" style="padding:38px 24px 30px;text-align:center"><div style="font-size:10px;letter-spacing:2px;color:#c394ff;font-weight:900">STUDIO RELAUNCH</div><h1 style="font-size:42px;line-height:1;color:#fff;margin:13px 0 25px;letter-spacing:-2px">${esc(headline)}</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;border-top:1px solid #44334f;border-bottom:1px solid #44334f"><tr><td align="center" style="padding:25px 8px"><div style="font-size:38px;line-height:1;color:#fff;font-weight:900">2 HOURS</div><div style="font-size:68px;line-height:1;color:#c394ff;font-weight:900;margin-top:5px">£100</div><div style="font-size:12px;color:#93899a;margin-top:8px"><s>Usually £120</s> · Save £20</div></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:25px auto 0"><tr><td bgcolor="#c394ff"><a href="${esc(ctaUrl)}" style="display:block;padding:15px 20px;color:#09060c;text-decoration:none;font-size:12px;font-weight:900">${esc(ctaLabel||'BOOK THE OFFER')} →</a></td></tr></table></td></tr><tr><td style="padding:30px 28px;border-top:1px solid #302737"><p style="margin:0 0 18px;color:#fff;font-size:15px">Hi {{{contact.first_name|there}}},</p>${paras(body)}</td></tr></table>`});
}
export function announcementHtml({preheader='',headline,body,ctaLabel,ctaUrl,imageUrl='',imageAlt=''}){
 return shell({preheader,imageUrl,imageAlt,content:`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:40px 28px"><div style="font-size:10px;letter-spacing:2px;color:#c394ff;font-weight:900">SILKCRAYON UPDATE</div><h1 style="font-size:40px;line-height:1.04;color:#fff;margin:14px 0 24px">${esc(headline)}</h1><p style="margin:0 0 18px;color:#fff;font-size:15px">Hi {{{contact.first_name|there}}},</p>${paras(body)}${button(ctaLabel,ctaUrl)}</td></tr></table>`});
}
export function renderMarketingHtml(args){if(args.template==='payday-relaunch')return paydayRelaunchHtml(args);if(args.template==='announcement')return announcementHtml(args);return broadcastHtml(args);}
export async function sendMarketingTest({to,subject,...args}){if(!to)throw new Error('A test email address is required.');const html=renderMarketingHtml(args).replace(/\{\{\{contact\.first_name\|there\}\}\}/g,'Nathan').replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g,'https://silkcrayon.com');return rr('/emails',{method:'POST',body:JSON.stringify({from:process.env.MARKETING_EMAIL_FROM||process.env.EMAIL_FROM,to:[to],subject:`TEST · ${subject}`,html,reply_to:process.env.EMAIL_REPLY_TO||'info@silkcrayon.com'})});}
export async function createBroadcast({name,subject,preheader,headline,body,ctaLabel,ctaUrl,imageUrl='',imageAlt='',template='',audienceKey='subscribers',send=false,scheduledAt='',userId=null}){const db=getAdminDb();const synced=await syncEligibleContacts(audienceKey),segmentId=synced.segmentId;const html=renderMarketingHtml({template,preheader,headline,body,ctaLabel,ctaUrl,imageUrl,imageAlt});const payload={segment_id:segmentId,from:process.env.MARKETING_EMAIL_FROM||process.env.EMAIL_FROM,subject,html,name,send};if(scheduledAt)payload.scheduled_at=scheduledAt;if(!payload.from)throw new Error('EMAIL_FROM or MARKETING_EMAIL_FROM is not configured.');const result=await rr('/broadcasts',{method:'POST',body:JSON.stringify(payload)});const count=synced.eligible;await db.from('marketing_campaigns').insert({created_by_user_id:userId,name,subject,preheader,headline,body,cta_label:ctaLabel,cta_url:ctaUrl,segment_id:segmentId,resend_broadcast_id:result.id,recipient_count:count||0,status:scheduledAt?'scheduled':send?'sent':'draft',sent_at:send&&!scheduledAt?new Date().toISOString():null});return {id:result.id,recipientCount:count||0};}

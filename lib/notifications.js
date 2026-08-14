import { getAdminDb } from './supabase';

function siteUrl(){ return process.env.NEXT_PUBLIC_SITE_URL || 'https://silkcrayon-studio.vercel.app'; }
function fromAddress(){ return process.env.EMAIL_FROM || 'Silkcrayon Studio <bookings@silkcrayon.com>'; }
function studioAddress(){ return process.env.STUDIO_ADDRESS || 'Cardiff Bay, Cardiff'; }
function mapsUrl(){ return process.env.STUDIO_MAP_URL || 'https://www.google.com/maps/search/?api=1&query=Silkcrayon+Studios+Cardiff+Bay'; }
function reviewUrl(){ return process.env.GOOGLE_REVIEW_URL || ''; }
function prettyDate(v){try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`));}catch{return v;}}
function calendarUrl(b){const clean=x=>String(x||'').replace(/:/g,'').slice(0,4)+'00';const d=String(b.booking_date).replaceAll('-','');const q=new URLSearchParams({action:'TEMPLATE',text:`Silkcrayon Studios — ${b.service_name}`,dates:`${d}T${clean(b.start_time)}/${d}T${clean(b.end_time)}`,location:studioAddress()});return `https://calendar.google.com/calendar/render?${q}`;}
function escapeHtml(v=''){return String(v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function shell(title,body,cta){return `<!doctype html><html><body style="margin:0;background:#08070a;color:#f7f3fa;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:42px 22px"><div style="color:#C394FF;font-size:12px;letter-spacing:3px;font-weight:700">SILKCRAYON STUDIO</div><h1 style="font-size:34px;line-height:1;margin:18px 0">${title}</h1><div style="color:#c8c1cc;font-size:16px;line-height:1.7">${body}</div>${cta?`<p style="margin-top:30px"><a href="${cta.href}" style="background:#C394FF;color:#0b0710;padding:14px 20px;text-decoration:none;font-weight:800;display:inline-block">${cta.label}</a></p>`:''}<p style="border-top:1px solid #302b35;margin-top:36px;padding-top:20px;color:#8f8894;font-size:12px">Cardiff Bay · Silkcrayon Studio</p></div></body></html>`}

export async function sendEmail({to,subject,html}){
 const key=process.env.RESEND_API_KEY;
 if(!key) return {ok:false,skipped:true,error:'RESEND_API_KEY is not configured'};
 const recipients=Array.isArray(to)?to:[to];
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:fromAddress(),to:recipients,subject,html})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) return {ok:false,error:data?.message||`Email provider returned ${r.status}`};
 return {ok:true,id:data.id};
}

async function upsertLog({bookingId=null,customerId=null,type,recipient,subject}){
 const db=getAdminDb();
 const q=db.from('notification_log').select('id,status').eq('notification_type',type).eq('recipient',recipient);
 if(bookingId)q.eq('booking_id',bookingId); else q.is('booking_id',null);
 const {data:existing}=await q.maybeSingle();
 if(existing?.status==='sent') return {duplicate:true,id:existing.id};
 if(existing?.id)return {id:existing.id};
 const {data,error}=await db.from('notification_log').insert({booking_id:bookingId,customer_id:customerId,notification_type:type,recipient,subject,status:'queued'}).select('id').single();
 if(error)throw error; return {id:data.id};
}

export async function sendLoggedNotification({booking,customer,type,subject,html}){
 const recipient=customer?.email;
 if(!booking?.id||!recipient)return {ok:false,skipped:true};
 const log=await upsertLog({bookingId:booking.id,customerId:customer.id,type,recipient,subject});
 if(log.duplicate)return {ok:true,duplicate:true};
 const result=await sendEmail({to:recipient,subject,html});
 await getAdminDb().from('notification_log').update({status:result.ok?'sent':result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',log.id);
 return result;
}

export async function sendStaffLoggedNotification({booking,type,to,subject,html}){
 if(!booking?.id||!to)return {ok:false,skipped:true};
 const recipient=String(to).toLowerCase();
 try{
  const log=await upsertLog({bookingId:booking.id,type,recipient,subject});
  if(log.duplicate)return {ok:true,duplicate:true};
  const result=await sendEmail({to:recipient,subject,html});
  await getAdminDb().from('notification_log').update({status:result.ok?'sent':result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',log.id);
  return result;
 }catch(e){
  // Notification logging must never break booking or assignment workflows.
  return await sendEmail({to:recipient,subject,html});
 }
}

export async function staffEmail(userId){
 if(!userId)return null;
 const {data,error}=await getAdminDb().auth.admin.getUserById(userId);
 if(error)return null;
 return data?.user?.email||null;
}

export async function ownerEmails(){
 const db=getAdminDb(); const {data:owners=[]}=await db.from('staff_profiles').select('user_id').eq('role','owner').eq('active',true);
 const emails=[]; for(const o of owners){const email=await staffEmail(o.user_id);if(email)emails.push(email)}
 return [...new Set(emails)];
}

export function confirmationEmail(b,c,{firstTime=false}={}){const artist=escapeHtml(c.artist_name||c.full_name);const guide=firstTime?`<h2 style="color:white">Your first session at Silkcrayon</h2><p><b>Before you arrive</b><br>Bring any beats, stems, reference tracks or files you need. Downloading them beforehand means more time creating.</p><p><b>When you arrive</b><br>Arrive 5–10 minutes early. Your engineer will get you settled and understand what you want to achieve.</p><p><b>Your booked time</b><br>Your session includes setup, recording and exporting files.</p><p>Silkcrayon is a positive creative environment. Your booking confirms acceptance of our No Harmful Music Policy.</p>`:`<p>Good to have you back. Everything is set for your next session.</p>`;return {subject:firstTime?'You’re booked in 🎙️ Welcome to Silkcrayon':`You’re booked in — ${prettyDate(b.booking_date)} at ${String(b.start_time).slice(0,5)}`,html:shell('You’re booked in.',`<p>Hi ${artist}, your Silkcrayon session is confirmed.</p><p><b>${escapeHtml(b.service_name)}</b><br>${prettyDate(b.booking_date)}<br>${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}<br>${escapeHtml(studioAddress())}</p><p><b>£${(Number(b.amount_pence||0)/100).toFixed(2)} · Paid</b></p>${guide}<p style="font-size:12px;color:#8f8894">Booking reference: ${String(b.id).slice(0,8).toUpperCase()}</p>`,{label:'ADD TO CALENDAR',href:calendarUrl(b)})}}
export function newBookingOwnerEmail(b,c,stats={}){return {subject:`New booking — ${c.artist_name||c.full_name} · ${b.booking_date} ${String(b.start_time).slice(0,5)}`,html:shell('New booking.',`<p><b>${escapeHtml(c.artist_name||c.full_name)}</b> · ${stats.firstTime?'NEW CUSTOMER':'RETURNING CUSTOMER'}</p><p>${escapeHtml(c.email||'')}<br>${escapeHtml(c.phone||'')}</p><p><b>${escapeHtml(b.service_name)}</b><br>${prettyDate(b.booking_date)}<br>${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}<br>£${(Number(b.amount_pence||0)/100).toFixed(2)} · Paid</p><p><b>Genre:</b> ${escapeHtml(b.genre||c.preferred_genre||'—')}<br><b>Customer note:</b> ${escapeHtml(b.notes||'—')}</p><p><b>History:</b> ${stats.firstTime?'First booking':`${stats.bookingCount||0} bookings · £${(Number(stats.lifetimeSpendPence||0)/100).toFixed(2)} lifetime spend`}</p><p>This booking is waiting for an engineer to be assigned.</p>`,{label:'ASSIGN ENGINEER',href:`${siteUrl()}/admin`})}}
export function engineerAssignedEmail(b,c,engineerName){return {subject:`New session assigned — ${b.booking_date} at ${String(b.start_time).slice(0,5)}`,html:shell('Session assigned.',`<p>Hi ${escapeHtml(engineerName)}, you’ve been assigned a Silkcrayon session.</p><p><b>${escapeHtml(c.artist_name||c.full_name)}</b><br>${escapeHtml(b.service_name)}<br>${prettyDate(b.booking_date)}<br>${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}</p>`,{label:'VIEW SESSION',href:`${siteUrl()}/admin/engineer/session/${b.id}`})}}
export function reminderEmail(b,c){const artist=escapeHtml(c.artist_name||c.full_name);return {subject:`Tomorrow at ${String(b.start_time).slice(0,5)} — your Silkcrayon session`,html:shell('See you tomorrow.',`<p>Hi ${artist}, a quick reminder that your session is tomorrow.</p><p><b>${escapeHtml(b.service_name)}</b><br>${prettyDate(b.booking_date)}<br>${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}<br>${escapeHtml(studioAddress())}</p><p>Bring anything you need and arrive 5–10 minutes early.</p>`,{label:'GET DIRECTIONS',href:mapsUrl()})}}
export function sessionFollowupEmail(b,c){const artist=escapeHtml(c.artist_name||c.full_name);const code=process.env.REBOOK_DISCOUNT_CODE||'';const offer=code?`<p><b>Book your next session today.</b><br>Use code <b style="color:#C394FF">${escapeHtml(code)}</b> at checkout.</p>`:`<p>Want to keep the momentum going? Book your next session below.</p>`;const review=reviewUrl()?`<p><b>Enjoyed your session?</b><br>An honest Google review really helps an independent studio like ours.</p><p><a href="${reviewUrl()}" style="color:#C394FF">Leave a Google review →</a></p>`:'';return {subject:'Thanks for creating with us today',html:shell('Thanks for creating with us.',`<p>Hi ${artist}, thanks for spending your session at Silkcrayon today.</p>${offer}${review}<p style="font-size:12px;color:#8f8894">The rebooking offer is separate from leaving a review.</p>`,{label:'BOOK NEXT SESSION',href:`${siteUrl()}/booking`})}}
export function bookAgainEmail(b,c){const artist=escapeHtml(c.artist_name||c.full_name);return {subject:'Ready for the next session?',html:shell('Keep the momentum.',`<p>Hi ${artist}, if you want to keep building while it’s fresh, you can book your next Silkcrayon session below.</p>`,{label:'BOOK NEXT SESSION',href:`${siteUrl()}/booking`})}}

export function customerAccessEmail(c,href){return {subject:'Your Silkcrayon sign-in link',html:shell('ARTIST PORTAL','Your studio, one tap away.',`<p>Hi ${esc(c.artist_name||c.full_name||'there')}, use the secure link below to access your Silkcrayon bookings and studio-hour balance.</p><p style="font-size:12px;color:#8f8894">This link expires in 30 minutes and can only be used once.</p>`,btn('OPEN MY SILKCRAYON',href))}}
export function packagePurchaseEmail(p,c){return {subject:`${Number(p.hours_credit||0)} studio hours added to your Silkcrayon account`,html:shell('STUDIO HOURS','Hours added.',`<p>Hi ${esc(c.artist_name||c.full_name||'there')}, your prepaid studio hours are ready.</p>${card([['Package',esc(p.description)],['Hours added',`${Number(p.hours_credit||0)}h`],['Paid',money(p.amount_pence)]])}<p>Your current balance is available in your artist portal.</p>`,btn('OPEN MY PORTAL',`${siteUrl()}/account`)+btn('BOOK A SESSION',`${siteUrl()}/booking`,true))}}

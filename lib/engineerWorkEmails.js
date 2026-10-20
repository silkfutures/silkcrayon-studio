// Email templates for engineer offers and payouts (matches the existing Silkcrayon email style).
import {escapeHtml} from './escapeHtml';

export function siteUrl(){
 const configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');
 if(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))return 'https://silkcrayon.com';
 return configured;
}
const money=p=>`£${(Number(p||0)/100).toFixed(Number(p||0)%100?2:0)}`;
export function prettyDate(v){try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`));}catch{return v;}}
export function prettyDeadline(v){try{return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(new Date(v));}catch{return String(v);}}
const time=b=>`${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)}`;
const artistOf=b=>b?.customers?.artist_name||b?.customers?.full_name||'Artist';

function shell(title,body,actions=''){
 return `<!doctype html><html><body style="margin:0;background:#08070a;color:#f7f3fa;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:42px 22px"><div style="color:#C394FF;font-size:12px;letter-spacing:3px;font-weight:700">SILKCRAYON STUDIO OS</div><h1 style="font-size:32px;line-height:1.05;margin:18px 0">${title}</h1><div style="color:#c8c1cc;font-size:16px;line-height:1.7">${body}</div>${actions}<p style="border-top:1px solid #302b35;margin-top:36px;padding-top:20px;color:#8f8894;font-size:12px">Cardiff Bay · Silkcrayon Studio</p></div></body></html>`;
}
const button=(href,label,solid=true)=>`<a href="${href}" style="display:inline-block;margin:0 10px 10px 0;padding:14px 22px;text-decoration:none;font-weight:800;${solid?'background:#C394FF;color:#0b0710':'border:1px solid #C394FF;color:#fff'}">${label}</a>`;

export function offerEmail({booking,offer,engineerName,token}){
 const link=`${siteUrl()}/engineer-offer/${token}`;
 const fee=offer.fee_pence!=null?`<b style="color:#fff">${money(offer.fee_pence)}</b>${offer.pay_hourly_pence!=null?` <span style="color:#8f8894">(${money(offer.pay_hourly_pence)}/hour × ${Number(booking.duration_minutes)/60}h)</span>`:''}`:'<b style="color:#fff">To be confirmed by the studio</b>';
 return {
  subject:`Session offer — ${prettyDate(booking.booking_date)} ${String(booking.start_time).slice(0,5)} · reply by ${prettyDeadline(offer.expires_at)}`,
  html:shell('Can you take this session?',`<p>Hi ${escapeHtml(engineerName)}, Silkcrayon would like to offer you a session.</p><div style="margin:22px 0;padding:20px;border:1px solid #4b3966;background:#0d0914"><p style="margin:0;color:#fff"><b>${escapeHtml(artistOf(booking))}</b><br>${escapeHtml(booking.service_name)}<br>${prettyDate(booking.booking_date)} · ${time(booking)} (${Number(booking.duration_minutes)/60}h)</p><p style="margin:14px 0 0">Your fee: ${fee}</p>${booking.genre?`<p style="margin:8px 0 0">Genre: ${escapeHtml(booking.genre)}</p>`:''}</div><p><b style="color:#C394FF">Please respond by ${prettyDeadline(offer.expires_at)}.</b> After that the offer closes and goes to another engineer.</p>`,
  `<p style="margin-top:26px">${button(`${link}?choice=accept`,'ACCEPT SESSION')}${button(`${link}?choice=decline`,'DECLINE',false)}</p><p style="font-size:12px;color:#8f8894">You can also respond from Today in Studio OS. This link is personal to you — please don’t forward it.</p>`)
 };
}

export function ownerOfferAlertEmail({booking,kind,detail=''}){
 const headline=kind==='needs_owner'?'Approve a substitute engineer.':'Nobody has accepted this session.';
 const lead=kind==='needs_owner'?'The artist chose a specific engineer for this booking, and that engineer hasn’t taken it. Approve the next backup (or pick someone else) before it is offered.':'Every engineer offered this session declined or didn’t respond in time.';
 return {
  subject:`${kind==='needs_owner'?'Approval needed':'Unfilled session'} — ${artistOf(booking)} · ${prettyDate(booking.booking_date)} ${String(booking.start_time).slice(0,5)}`,
  html:shell(headline,`<p>${lead}</p><p><b style="color:#fff">${escapeHtml(artistOf(booking))}</b><br>${escapeHtml(booking.service_name)}<br>${prettyDate(booking.booking_date)} · ${time(booking)}</p>${detail?`<p>${escapeHtml(detail)}</p>`:''}`,`<p style="margin-top:26px">${button(`${siteUrl()}/admin/engineer/session/${booking.id}`,'OPEN SESSION')}</p>`)
 };
}

export function payoutPaidEmail({payout,booking,engineerName}){
 return {
  subject:`You’ve been paid ${money(payout.amount_pence)} — ${booking?artistOf(booking):'Silkcrayon session'}`,
  html:shell(`${money(payout.amount_pence)} is on its way.`,`<p>Hi ${escapeHtml(engineerName)}, your payment has been released to your Stripe account.</p><div style="margin:22px 0;padding:20px;border:1px solid #4b3966;background:#0d0914"><p style="margin:0;color:#fff">${booking?`<b>${escapeHtml(artistOf(booking))}</b><br>${prettyDate(booking.booking_date)} · ${time(booking)}<br>`:''}${payout.kind==='extra_time'?'Extra time':'Session fee'}${payout.hours?` · ${Number(payout.hours)}h`:''}<br><b style="color:#C394FF">${money(payout.amount_pence)}</b></p></div><p>It reaches your bank on your Stripe payout schedule. If Instant Payouts are available on your account you can withdraw sooner from your Stripe dashboard (Stripe fees apply).</p>`,`<p style="margin-top:26px">${button(`${siteUrl()}/admin/engineer/payouts`,'VIEW MY EARNINGS')}</p>`)
 };
}

export function payoutSetupNudgeEmail({payout,engineerName}){
 return {
  subject:`Set up payouts to receive ${money(payout.amount_pence)}`,
  html:shell('Finish your payout setup.',`<p>Hi ${escapeHtml(engineerName)}, you have <b style="color:#fff">${money(payout.amount_pence)}</b> ready to be paid, but your payout account isn’t set up yet.</p><p>It’s a one-time setup with Stripe (about 5 minutes). As soon as it’s done, this and future session payments are sent automatically.</p>`,`<p style="margin-top:26px">${button(`${siteUrl()}/admin/engineer/payouts`,'SET UP PAYOUTS')}</p>`)
 };
}

export function payoutFailedOwnerEmail({payout,engineerName,error}){
 return {
  subject:`Engineer payout failed — ${engineerName} · ${money(payout.amount_pence)}`,
  html:shell('An engineer payout didn’t go through.',`<p><b style="color:#fff">${escapeHtml(engineerName)}</b> · ${money(payout.amount_pence)}</p><p>${escapeHtml(error||'Unknown error')}</p><p>Studio OS retries automatically. No duplicate payment will be made.</p>`,`<p style="margin-top:26px">${button(`${siteUrl()}/admin/engineer-pay`,'OPEN ENGINEER PAY')}</p>`)
 };
}

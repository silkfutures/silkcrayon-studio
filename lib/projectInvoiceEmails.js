import {escapeHtml as esc} from './escapeHtml.js';
const money=n=>`£${(Number(n||0)/100).toFixed(2)}`;
const wrap=(title,body)=>`<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f3f0f6;font:16px/1.65 Arial,sans-serif;color:#514958"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2dbea;padding:28px;box-sizing:border-box"><p style="color:#68409a;letter-spacing:3px;font-size:12px;font-weight:bold">SILKCRAYON STUDIOS</p><h1 style="font-size:28px;line-height:1.2;color:#21182b">${title}</h1>${body}<p>The Silkcrayon team<br>info@silkcrayon.com · silkcrayon.com</p></div></body></html>`;
function prettyDate(v){try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`));}catch{return v;}}

export function projectInvoiceEmail({project,invoice,bank,payUrl,ref}){
 const bankBlock=bank?.complete?`<div style="margin:18px 0;padding:16px;background:#f5f1fa;border-left:3px solid #68409a"><b style="color:#21182b">Pay by bank transfer</b><br>Account name: <b>${esc(bank.name)}</b><br>Sort code: <b>${esc(bank.sortCode)}</b><br>Account number: <b>${esc(bank.accountNumber)}</b><br>Reference: <b>${esc(ref)}</b></div>`:'';
 const card=payUrl?`<p style="margin:22px 0"><a href="${payUrl}" style="display:inline-block;background:#68409a;color:#fff;padding:14px 22px;text-decoration:none;border-radius:6px;font-weight:bold">Pay ${money(invoice.amount_pence)} by card</a></p>`:'';
 return {subject:`Invoice ${ref} — ${invoice.description}`,html:wrap(`Your invoice: ${money(invoice.amount_pence)}.`,`<p>Hi ${esc(project.contact_name||'there')},</p><p>Here’s your invoice for <b>${esc(project.title)}</b>. The PDF is attached.</p><p style="padding:14px;background:#f5f1fa"><b>${esc(invoice.description)}</b><br>Amount due: <b>${money(invoice.amount_pence)}</b>${invoice.due_date?`<br>Due by: <b>${esc(prettyDate(invoice.due_date))}</b>`:''}<br>Invoice reference: <b>${esc(ref)}</b></p>${card}${bankBlock}${card||bankBlock?'':'<p>Reply to this email and we’ll send payment details.</p>'}<p>Once your payment arrives we’ll email you a receipt.</p>`)};
}
export function projectInvoiceReceiptEmail({project,invoice,ref}){
 return {subject:`Payment received — ${invoice.description}`,html:wrap('Thank you — payment received.',`<p>Hi ${esc(project.contact_name||'there')},</p><p>We’ve received <b>${money(invoice.amount_pence)}</b> for <b>${esc(project.title)}</b> (${esc(invoice.description)}). Your receipt is attached.</p><p style="padding:14px;background:#f5f1fa">Reference: <b>${esc(ref)}</b></p>`)};
}
export function ownerInvoicePaidEmail({project,invoice,ref,via,warning=null}){
 return {subject:`${warning?'⚠ Check payment':'Paid'}: ${money(invoice.amount_pence)} — ${project.title}`,html:wrap(warning?'Check this payment.':'Invoice paid.',`<p><b>${esc(project.title)}</b> · ${esc(invoice.description)}<br>${money(invoice.amount_pence)} · ${esc(via)} · ${esc(ref)}</p>${warning?`<p style="color:#a1263a"><b>${esc(warning)}</b></p>`:''}`)};
}

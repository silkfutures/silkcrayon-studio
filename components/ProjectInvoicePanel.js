'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';

const money=p=>`£${(Number(p||0)/100).toFixed(2)}`;
const when=v=>{try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(new Date(v));}catch{return '';}};
const STATUS={sent:['Awaiting payment','awaiting'],paid:['Paid','paid'],void:['Cancelled','cancelled']};
const VIA={stripe:'card',bank_transfer:'bank transfer',cash:'cash',other:'other'};
const addDays=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);

export default function ProjectInvoicePanel({projectId,summary,invoices=[],bankComplete,termsDays=7,hasEmail}){
 const router=useRouter();
 const [stage,setStage]=useState(summary.paid?'balance':'deposit'),[percent,setPercent]=useState('50'),[custom,setCustom]=useState(''),[desc,setDesc]=useState(''),[due,setDue]=useState(addDays(termsDays));
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[payFor,setPayFor]=useState(null),[method,setMethod]=useState('bank_transfer'),[note,setNote]=useState('');
 const amount=useMemo(()=>stage==='deposit'?Math.round(summary.total*Number(percent||0)/100):stage==='full'?summary.total:stage==='balance'?summary.remaining:Math.round(Number(custom||0)*100),[stage,percent,custom,summary]);
 const open=invoices.find(i=>i.status==='sent');
 async function call(method,body,ok){
  setBusy(true);setMsg('Working…');
  try{const r=await fetch(`/api/admin/projects/${projectId}/invoices`,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok===false)setMsg(j.error||'Could not update.');else{setMsg(typeof ok==='function'?ok(j):ok);setPayFor(null);setNote('');router.refresh();}
  }catch{setMsg('Network problem — please retry.');}finally{setBusy(false);}
 }
 const send=()=>{if(!confirm(`Email an invoice for ${money(amount)} to the customer?`))return;call('POST',{stage,percent:Number(percent),amount:stage==='custom'?custom:null,description:desc,dueDate:due},j=>j.emailed?`Invoice ${money(amount)} emailed ✓${j.bankMissing?' — add bank details in Settings so the next one shows them.':''}`:`Invoice saved, but the email failed (${j.emailError||'unknown'}). Use Resend.`);};
 return <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Billing</p><h2>Invoice this quote</h2><p className="muted">Send a deposit, the balance or the full amount. The customer can pay by card, or by bank transfer with the details on the invoice.</p></div></div>
  <div className={s.stats}><div><small>Quote total</small><b data-sensitive="financial">{money(summary.total)}</b></div><div><small>Paid</small><b data-sensitive="financial">{money(summary.paid)}</b></div><div><small>Invoiced, unpaid</small><b data-sensitive="financial">{money(summary.openAmount)}</b></div><div><small>Left to invoice</small><b data-sensitive="financial">{money(Math.max(0,summary.remaining-summary.openAmount))}</b></div></div>
  {!bankComplete&&<p className={s.message}>No bank details yet — invoices will only offer card payment. Add them in Settings → Invoice payment details.</p>}
  {invoices.length>0&&<div className={s.history} style={{marginBottom:18}}>{invoices.map(i=>{const [label,cls]=STATUS[i.status];return <div className={s.historyRow} key={i.id}><span className={s.position}>£</span><div><b data-sensitive="financial">{money(i.amount_pence)} · {i.description}</b><small>{i.status==='paid'?`Paid ${when(i.paid_at)} by ${VIA[i.paid_via]||i.paid_via}${i.paid_note?` — ${i.paid_note}`:''}`:i.status==='void'?`Cancelled ${when(i.voided_at)}`:`Sent ${i.sent_at?when(i.sent_at):'—'} to ${i.sent_to||'—'}${i.due_date?` · due ${i.due_date}`:''}`}{i.email_error&&i.status==='sent'?` · email failed: ${i.email_error}`:''}</small>
    <div className={s.row} style={{marginTop:8}}>{i.document_id&&<a className={s.secondary} href={`/api/documents/project/${projectId}?version=${i.document_id}`}>Invoice PDF</a>}{i.receipt_document_id&&<a className={s.secondary} href={`/api/documents/project/${projectId}?version=${i.receipt_document_id}`}>Receipt PDF</a>}
     {i.status==='sent'&&<><button className={s.primary} disabled={busy} onClick={()=>setPayFor(payFor===i.id?null:i.id)}>Mark as paid</button><button className={s.secondary} disabled={busy} onClick={()=>call('PATCH',{invoiceId:i.id,action:'resend'},'Invoice re-sent ✓ (the old payment link no longer works)')}>Resend</button><button className={s.danger} disabled={busy} onClick={()=>{if(confirm('Cancel this invoice? Its payment link will stop working.'))call('PATCH',{invoiceId:i.id,action:'void'},'Invoice cancelled.');}}>Cancel invoice</button></>}</div>
    {payFor===i.id&&<div className={s.form} style={{marginTop:10}}><div className={s.row}><label className={s.field}><span>How did they pay?</span><select className={s.select} value={method} onChange={e=>setMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label className={s.field}><span>Note (optional)</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Monzo 21 Oct"/></label></div><div className={s.row}><button className={s.primary} disabled={busy} onClick={()=>call('PATCH',{invoiceId:i.id,action:'mark_paid',method,note},'Marked paid ✓ — receipt emailed to the customer.')}>Confirm {money(i.amount_pence)} received</button></div><p className={s.muted}>Studio OS checks Stripe first — if they’ve already paid by card, it won’t let you record it twice.</p></div>}
   </div><span className={`${s.pill} ${s[cls]||''}`}>{label}</span></div>;})}</div>}
  {open?<p className={s.muted}>One invoice at a time: mark the current one paid or cancel it before sending the next.</p>:!hasEmail?<p className={s.message}>Add a customer email to this project to send invoices.</p>:summary.remaining<=0?<p className={s.message}>✓ The full quote has been paid.</p>:summary.total<=0?<p className={s.muted}>Save the quote prices first.</p>:<div className={s.form}>
   <b>New invoice</b>
   <div className={s.row}>
    {!summary.paid&&<label className={s.check}><input type="radio" checked={stage==='deposit'} onChange={()=>setStage('deposit')}/><span>Deposit</span></label>}
    {!summary.paid&&<label className={s.check}><input type="radio" checked={stage==='full'} onChange={()=>setStage('full')}/><span>Full amount</span></label>}
    {summary.paid>0&&<label className={s.check}><input type="radio" checked={stage==='balance'} onChange={()=>setStage('balance')}/><span>Balance remaining</span></label>}
    <label className={s.check}><input type="radio" checked={stage==='custom'} onChange={()=>setStage('custom')}/><span>Custom amount</span></label>
   </div>
   <div className={s.row}>
    {stage==='deposit'&&<label className={s.field}><span>Deposit %</span><input className={s.amountInput} type="number" min="5" max="95" step="5" value={percent} onChange={e=>setPercent(e.target.value)}/></label>}
    {stage==='custom'&&<label className={s.field}><span>Amount (£)</span><input className={s.amountInput} inputMode="decimal" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="0.00"/></label>}
    <label className={s.field}><span>Due date</span><input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
    <label className={s.field} style={{flex:1,minWidth:220}}><span>Line description (optional)</span><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder={stage==='deposit'?`Deposit (${percent}%) — project`:'Leave blank for the default'}/></label>
   </div>
   <div className={s.feeBox}><div><small>This invoice</small><b data-sensitive="financial">{money(amount)}</b></div><button className={s.primary} disabled={busy||amount<30||amount>summary.remaining} onClick={send}>{busy?'Sending…':`Email invoice for ${money(amount)}`}</button></div>
   {amount>summary.remaining&&<p className={s.message}>That’s more than the {money(summary.remaining)} left on the quote.</p>}
  </div>}
  {msg&&<p className={s.message} role="status">{msg}</p>}
 </section>;
}

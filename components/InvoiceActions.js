'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';
import DuplicateInvoiceButton from './DuplicateInvoiceButton';
const money=p=>`£${(Number(p||0)/100).toFixed(2)}`;
export default function InvoiceActions({invoice,openPayment=false}){
 const router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[paying,setPaying]=useState(openPayment),[method,setMethod]=useState('bank_transfer'),[note,setNote]=useState('');
 async function act(body,ok,confirmText){
  if(confirmText&&!confirm(confirmText))return;
  setBusy(true);setMsg('Working…');
  try{const r=await fetch(`/api/admin/invoices/${invoice.id}`,{method:body?'PATCH':'DELETE',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok===false)setMsg(j.error||'Could not update.');else{setMsg(ok);setPaying(false);if(!body){router.push('/admin/invoicing');}router.refresh();}
  }catch{setMsg('Network problem — please retry.');}finally{setBusy(false);}
 }
 return <div className={s.panel}>
  <div className={s.row}>
   {invoice.status!=='draft'&&<DuplicateInvoiceButton fromInvoiceId={invoice.id}/>}
   {(invoice.document_id||invoice.receipt_document_id)&&<a className={s.secondary} href={`/api/documents/invoice/${invoice.id}`}>Download PDF</a>}
   {invoice.status==='draft'&&<><button className={s.primary} disabled={busy} onClick={()=>act({action:'send'},'Invoice emailed ✓',`Email this invoice for ${money(invoice.total_pence)} to ${invoice.bill_to_email||'(no email)'}?`)}>Email invoice</button><button className={s.danger} disabled={busy} onClick={()=>act(null,'Deleted.','Delete this draft?')}>Delete draft</button></>}
   {invoice.status==='sent'&&<><button className={s.primary} disabled={busy} onClick={()=>setPaying(v=>!v)}>Mark as paid</button><button className={s.secondary} disabled={busy} onClick={()=>act({action:'resend'},'Invoice re-sent ✓ (the old payment link no longer works)')}>Resend</button><button className={s.danger} disabled={busy} onClick={()=>act({action:'void'},'Invoice cancelled.','Cancel this invoice? Its payment link stops working and any sessions on it become available to invoice again.')}>Cancel invoice</button></>}
  </div>
  {paying&&<div className={s.form}><div className={s.row}><label className={s.field}><span>How did they pay?</span><select className={s.select} value={method} onChange={e=>setMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label className={s.field}><span>Note (optional)</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Monzo 21 Oct"/></label></div><button className={s.primary} disabled={busy} onClick={()=>act({action:'mark_paid',method,note},'Marked paid ✓ — receipt emailed and added to Accounting.')}>Confirm {money(invoice.total_pence)} received</button><p className={s.muted}>Checks Stripe first — if they’ve already paid by card it won’t record it twice.</p></div>}
  {msg&&<p className={s.message} role="status">{msg}</p>}
 </div>;
}

"use client";
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';

const methodLabel={bank_transfer:'Bank transfer',cash:'Cash',external_card:'Card / banking app',other:'Other'};
export default function AdditionalSessionPayment({bookingId,hourlyPrice=50,extraHours=1,payments=[]}){
 const router=useRouter();const [open,setOpen]=useState(false),[msg,setMsg]=useState('');
 const total=useMemo(()=>payments.filter(p=>p.status==='paid').reduce((n,p)=>n+Number(p.amount_pence||0),0),[payments]);
 async function submit(e){e.preventDefault();setMsg('Saving…');const fd=new FormData(e.currentTarget);const r=await fetch(`/api/admin/bookings/${bookingId}/manual-payment`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(fd.entries()))});const j=await r.json();if(!r.ok)return setMsg(j.error||'Could not record payment.');setMsg('Payment recorded ✓');setOpen(false);router.refresh()}
 return <div className="additionalPaymentPanel">
  <div className="additionalPaymentHead"><div><small>ADDITIONAL PAYMENTS</small><b>{total?`£${(total/100).toFixed(2)} recorded`:'None recorded'}</b></div><button type="button" className="engSecondaryAction" onClick={()=>setOpen(!open)}>{open?'Close':'+ Record payment'}</button></div>
  {payments.length>0&&<div className="additionalPaymentHistory">{payments.map(p=><div key={p.id}><span>{p.description}</span><b>£{(Number(p.amount_pence||0)/100).toFixed(2)}</b><small>{methodLabel[p.payment_method]||p.payment_method||'Manual'} · {p.paid_at?new Date(p.paid_at).toLocaleDateString('en-GB'):'paid'}</small></div>)}</div>}
  {open&&<form className="additionalPaymentForm" onSubmit={submit}><div className="engTwoCols"><label className="field"><span>Amount paid (£)</span><input name="amount" type="number" min="0.30" step="0.01" defaultValue={(Number(hourlyPrice)*Number(extraHours||1)).toFixed(2)} required/></label><label className="field"><span>Paid via</span><select name="paymentMethod" defaultValue="bank_transfer"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="external_card">Card / banking app</option><option value="other">Other</option></select></label></div><input type="hidden" name="extraHours" value={extraHours||1}/><label className="field"><span>Description</span><input name="description" defaultValue={`Extra studio time · ${extraHours||1}h`}/></label><button className="engPrimaryAction buttonLike">Record as paid <span>✓</span></button></form>}
  {msg&&<div className="engSaveMsg">{msg}</div>}
 </div>
}

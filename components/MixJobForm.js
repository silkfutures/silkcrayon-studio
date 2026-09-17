'use client';

import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import ArtistSearchSelect from './ArtistSearchSelect';

const turnaroundOptions=[
  '3 working days from payment and complete files',
  '5 working days from payment and complete files',
  '7 working days from payment and complete files',
  '10 working days from payment and complete files',
  '14 working days from payment and complete files'
];

export default function MixJobForm({customers=[]}){
  const router=useRouter();
  const [customerId,setCustomerId]=useState('');
  const [tracks,setTracks]=useState([{title:''}]);
  const [quotedPrice,setQuotedPrice]=useState('');
  const [paymentMode,setPaymentMode]=useState('unpaid');
  const [paidAmount,setPaidAmount]=useState('');
  const [notifyCustomer,setNotifyCustomer]=useState(true);
  const [paymentRequestMethod,setPaymentRequestMethod]=useState('monzo');
  const [monzoPaymentUrl,setMonzoPaymentUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');

  const remaining=useMemo(()=>{
    const total=Number(quotedPrice);
    const received=paymentMode==='paid'?total:Number(paidAmount);
    if(!Number.isFinite(total)||total<0)return null;
    return Math.max(0,total-(Number.isFinite(received)?received:0));
  },[quotedPrice,paidAmount,paymentMode]);

  async function submit(e){
    e.preventDefault();setBusy(true);setMsg('');
    const f=new FormData(e.currentTarget);
    const body={
      customerId,
      tracks:tracks.map(t=>t.title),
      serviceType:f.get('serviceType'),
      quotedPrice,
      paymentMode,
      paidAmount:paymentMode==='partial_paid'?paidAmount:null,
      paymentMethod:paymentMode==='unpaid'?null:f.get('paymentMethod'),
      paymentReference:paymentMode==='unpaid'?null:f.get('paymentReference'),
      paymentDueDate:paymentMode==='paid'?null:f.get('paymentDueDate'),
      paymentRequestMethod:paymentMode==='paid'?null:paymentRequestMethod,
      monzoPaymentUrl:paymentMode!=='paid'&&paymentRequestMethod==='monzo'?monzoPaymentUrl.trim():null,
      turnaroundText:f.get('turnaroundText'),
      includedRevisions:f.get('includedRevisions'),
      notifyCustomer,
      filesReceived:f.get('filesReceived')==='on',
      referenceTracks:f.get('referenceTracks'),
      notes:f.get('notes'),
      vocalTuningEditing:f.get('vocalTuningEditing')==='on',
      stemDelivery:f.get('stemDelivery')==='on'
    };
    try{
      const r=await fetch('/api/admin/mixes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){setMsg(j.error||'Could not create mix.');return}
      const notice=j.warning||(!notifyCustomer?'Mix created internally. No customer message was sent.':paymentMode==='paid'?(j.emailSent?'Mix created and customer confirmation sent ✓':'Mix created. Customer confirmation was not sent.'):(j.emailSent?`Mix created and payment / what-to-expect email sent ✓${j.smsSent?' Text sent too.':''}`:'Mix created, but the payment email was not confirmed as sent.'));
      sessionStorage.setItem('silkcrayonMixNotice',JSON.stringify({kind:j.warning||(!j.emailSent&&notifyCustomer)?'warning':'success',text:notice}));
      router.push(`/admin/mixes/${j.id}`);
    }catch{setMsg('Could not create the mix. Check your connection and try again.')}finally{setBusy(false)}
  }

  const customerAction=notifyCustomer
    ? paymentMode==='paid'?'Create & send confirmation →':paymentRequestMethod==='monzo'?'Create & send Monzo payment link →':'Create & email Stripe checkout →'
    : paymentMode==='paid'?'Create as paid →':paymentMode==='partial_paid'?'Create with deposit →':'Save internally →';

  return <section className="adminSection">
    <p className="eyebrow">New internal job</p>
    <h2>Create a mix</h2>
    <p className="muted">Set the commercial terms once. If customer notification is on, Silkcrayon sends a clear “what to expect” email immediately and includes payment where money is still outstanding.</p>
    <form className="mixJobForm" onSubmit={submit}>
      <div className="field wide"><span>Customer</span><ArtistSearchSelect customers={customers} value={customerId} onChange={setCustomerId}/></div>
      <div className="field wide"><span>Tracks</span><div className="mixTrackBuilder">
        {tracks.map((t,i)=><div className="mixTrackRow" key={i}><b>{String(i+1).padStart(2,'0')}</b><input required value={t.title} onChange={e=>setTracks(x=>x.map((a,n)=>n===i?{title:e.target.value}:a))} placeholder="Track title"/><button type="button" disabled={tracks.length===1} onClick={()=>setTracks(x=>x.filter((_,n)=>n!==i))}>Remove</button></div>)}
        <button type="button" className="button outline" onClick={()=>setTracks(x=>[...x,{title:''}])}>+ Add another track</button>
      </div></div>

      <div className="mixFormGrid">
        <label className="field"><span>Service</span><select name="serviceType"><option value="mix_only">Mix only</option><option value="mix_master">Mix + master</option><option value="master_only">Master only</option><option value="not_sure">Decide after review</option></select></label>
        <label className="field"><span>Overall quote (£)</span><input name="quotedPrice" type="number" min="0" step="0.01" required value={quotedPrice} onChange={e=>setQuotedPrice(e.target.value)}/></label>
        <label className="field"><span>Turnaround</span><select name="turnaroundText" defaultValue={turnaroundOptions[2]}>{turnaroundOptions.map(option=><option value={option} key={option}>{option.replace(' from payment and complete files','')}</option>)}</select><small>The email makes clear that the clock starts after payment and complete files.</small></label>
        <label className="field"><span>Included revision rounds</span><input name="includedRevisions" type="number" min="0" max="10" defaultValue="1"/><small>The review page keeps approval primary and revisions secondary.</small></label>
        <label className="field"><span>Payment status</span><select value={paymentMode} onChange={e=>{setPaymentMode(e.target.value);setPaidAmount('')}}><option value="unpaid">Payment due / not paid yet</option><option value="paid">Paid already</option><option value="partial_paid">Deposit / part paid</option></select><small>{paymentMode==='paid'?'The full quote is recorded as received and the mix goes straight to Ready to start.':paymentMode==='partial_paid'?'Record what has arrived; the payment link requests only the remainder.':'The email payment link requests the full quote.'}</small></label>
        {paymentMode!=='paid'&&<label className="field"><span>Payment due</span><input name="paymentDueDate" type="date"/></label>}
        {paymentMode==='partial_paid'&&<label className="field"><span>Already received (£)</span><input name="paidAmount" type="number" min="0.01" step="0.01" required value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/><small>{remaining===null?'Enter the quote first.':`Remaining to request: £${remaining.toFixed(2)}`}</small></label>}
        {paymentMode!=='paid'&&<label className="field"><span>Payment request</span><select value={paymentRequestMethod} onChange={e=>setPaymentRequestMethod(e.target.value)}><option value="monzo">Monzo payment link</option><option value="stripe">Stripe checkout</option></select><small>Monzo avoids Stripe checkout fees. Stripe stays available when you want automatic payment detection.</small></label>}
        {paymentMode!=='paid'&&paymentRequestMethod==='monzo'&&<label className="field wide"><span>Monzo payment link</span><input type="url" inputMode="url" placeholder="https://..." required={notifyCustomer} value={monzoPaymentUrl} onChange={e=>setMonzoPaymentUrl(e.target.value)}/><small>Create the link in Monzo for exactly {remaining===null?'the outstanding balance':`£${remaining.toFixed(2)}`}, paste it here, and Silkcrayon will put it behind the customer’s payment button.</small></label>}
        {paymentMode!=='unpaid'&&<><label className="field"><span>Payment method</span><select name="paymentMethod" defaultValue="bank_transfer"><option value="bank_transfer">Monzo / bank transfer</option><option value="cash">Cash</option><option value="card">Card paid separately</option><option value="manual">Other manual payment</option></select></label><label className="field"><span>Payment reference (optional)</span><input name="paymentReference" maxLength="200" placeholder="Monzo reference, invoice note, etc."/></label></>}
        <label className="checkRow"><input name="filesReceived" type="checkbox"/><span>Files received</span></label>
        <label className="checkRow"><input name="vocalTuningEditing" type="checkbox"/><span>Vocal tuning / editing</span></label>
        <label className="checkRow"><input name="stemDelivery" type="checkbox"/><span>Stem delivery</span></label>
      </div>

      <label className="field"><span>Reference tracks</span><textarea name="referenceTracks"/></label>
      <label className="field"><span>Internal notes</span><textarea name="notes"/></label>

      <label className="mixCustomerNotify"><input type="checkbox" checked={notifyCustomer} onChange={e=>setNotifyCustomer(e.target.checked)}/><span><b>{paymentMode==='paid'?'Send customer confirmation':'Email customer now with payment link'}</b><small>{paymentMode==='paid'?'They receive the turnaround, process and review expectations.':paymentRequestMethod==='monzo'?'They receive the polished setup email with your Monzo link as the main Pay button. You will mark the mix paid when the money lands.':'They receive the polished setup email with Stripe checkout as the main Pay button. Stripe can mark the mix paid automatically.'}</small></span></label>

      <button className="button primary" disabled={busy||!customerId}>{busy?'Saving…':customerAction}</button>
      {msg&&<small role="status">{msg}</small>}
    </form>
  </section>;
}

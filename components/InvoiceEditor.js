'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import ArtistSearchSelect from './ArtistSearchSelect';
import s from './EngineerWork.module.css';

const money=p=>`£${(Number(p||0)/100).toFixed(2)}`;
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
const addDays=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const uk=v=>{try{return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`));}catch{return v;}};
const blank=()=>({key:Math.random().toString(36).slice(2),type:'custom',date:today(),service:'',description:'',qty:'1',rate:''});

/** Create or edit a draft invoice. */
export default function InvoiceEditor({customers=[],initial=null,hourlyPence=5000,termsDays=7,bankComplete=false,preselect=''}){
 const router=useRouter();
 const [customerId,setCustomerId]=useState(initial?.customer_id||preselect||'');
 const [manual,setManual]=useState(Boolean(initial&&!initial.customer_id));
 const [billTo,setBillTo]=useState({name:initial?.bill_to_name||'',email:initial?.bill_to_email||'',address:initial?.bill_to_address||''});
 const [lines,setLines]=useState(()=>initial?.lines?.length?initial.lines.map(l=>({key:Math.random().toString(36).slice(2),...l,qty:String(l.qty),rate:(l.rate_pence/100).toFixed(2)})):[blank()]);
 const [due,setDue]=useState(initial?.due_date||addDays(termsDays)),[notes,setNotes]=useState(initial?.notes||''),[title,setTitle]=useState(initial?.title||'');
 const [billable,setBillable]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');

 const chosen=customers.find(c=>String(c.id)===String(customerId));
 useEffect(()=>{
  if(!customerId){setBillable(null);return;}
  if(chosen&&!initial)setBillTo(b=>({...b,name:chosen.artist_name&&chosen.full_name&&chosen.artist_name!==chosen.full_name?`${chosen.full_name} (${chosen.artist_name})`:chosen.full_name||chosen.artist_name||'',email:chosen.email||''}));
  let live=true;setBillable('loading');
  fetch(`/api/admin/invoices?customerId=${customerId}`).then(r=>r.json()).then(j=>{if(live)setBillable(j.error?{error:j.error}:j);}).catch(()=>live&&setBillable({error:'Could not load sessions.'}));
  return ()=>{live=false;};
 },[customerId]);// eslint-disable-line react-hooks/exhaustive-deps

 const onInvoice=id=>lines.some(l=>l.booking_id===id||l.session_report_id===id);
 function addBooking(b){if(onInvoice(b.id))return;setLines(ls=>[...ls.filter(l=>l.service||l.description||l.rate),{key:b.id,type:'booking',booking_id:b.id,date:b.booking_date,service:b.service_name||'Studio session',description:`${String(b.start_time).slice(0,5)}–${String(b.end_time).slice(0,5)} · ${Number(b.duration_minutes)/60}h${Number(b.amount_paid_pence)>0?` (after ${money(b.amount_paid_pence)} already paid)`:''}`,qty:'1',rate:(b.due_pence/100).toFixed(2)}]);}
 function addSession(r){if(onInvoice(r.id))return;const h=Number(r.actual_hours)||1;setLines(ls=>[...ls.filter(l=>l.service||l.description||l.rate),{key:r.id,type:'session',session_report_id:r.id,hours:h,date:r.session_date,service:'Studio session',description:[r.start_time?String(r.start_time).slice(0,5):null,r.work_completed].filter(Boolean).join(' · ').slice(0,200)||'Logged session',qty:String(h),rate:(hourlyPence/100).toFixed(2)}]);}
 const set=(key,field)=>e=>setLines(ls=>ls.map(l=>l.key===key?{...l,[field]:e.target.value}:l));
 const total=useMemo(()=>lines.reduce((n,l)=>n+Math.round((Number(l.qty)||0)*Math.round((Number(l.rate)||0)*100)),0),[lines]);

 function payload(){return {customerId:manual?null:customerId||null,billToName:billTo.name,billToEmail:billTo.email,billToAddress:billTo.address,title,dueDate:due,notes,
  lines:lines.filter(l=>l.service||l.description||l.rate).map(l=>({type:l.type,booking_id:l.booking_id,session_report_id:l.session_report_id,hours:l.hours,date:l.date,service:l.service,description:l.description,qty:Number(l.qty),rate_pence:Math.round((Number(l.rate)||0)*100)}))};}
 async function save(send){
  if(send&&!billTo.email){setMsg('Add an email address to send it.');return;}
  if(send&&!confirm(`Email this invoice for ${money(total)} to ${billTo.email}?`))return;
  setBusy(true);setMsg(send?'Sending…':'Saving…');
  try{
   const r=initial?await fetch(`/api/admin/invoices/${initial.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:send?'save_send':'save',invoice:payload()})}):await fetch('/api/admin/invoices',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload(),send})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok===false){setMsg(j.error||'Could not save.');setBusy(false);return;}
   const id=initial?.id||j.id;router.push(`/admin/invoicing/${id}${send?`?sent=${j.emailed===false?'failed':'1'}`:''}`);router.refresh();
  }catch{setMsg('Network problem — please retry.');setBusy(false);}
 }

 const pending=billable&&billable!=='loading'&&!billable.error?[...(billable.bookings||[]).map(b=>({kind:'booking',item:b})),...(billable.sessions||[]).map(r=>({kind:'session',item:r}))]:[];
 return <div className={s.panel}>
  <section className="adminSection"><p className="eyebrow">Bill to</p>
   {!manual&&<ArtistSearchSelect customers={customers} value={customerId} onChange={setCustomerId} label="artist"/>}
   <label className={s.check} style={{marginTop:10}}><input type="checkbox" checked={manual} onChange={e=>{setManual(e.target.checked);if(e.target.checked){setCustomerId('');}}}/><span>Invoice someone who isn’t in my artists (e.g. an organisation)</span></label>
   <div className={s.settingsGrid} style={{marginTop:12}}>
    <label className={s.field}><span>Name on invoice</span><input value={billTo.name} onChange={e=>setBillTo({...billTo,name:e.target.value})} placeholder="e.g. Ms Lily Webbe"/></label>
    <label className={s.field}><span>Email (where it’s sent)</span><input type="email" value={billTo.email} onChange={e=>setBillTo({...billTo,email:e.target.value})}/></label>
    <label className={s.field} style={{gridColumn:'1/-1'}}><span>Address (optional)</span><textarea className={s.textarea} rows={3} value={billTo.address} onChange={e=>setBillTo({...billTo,address:e.target.value})} placeholder={'Wales Millennium Centre, Bute Pl\nCardiff\nCF10 5AL'}/></label>
   </div>
  </section>

  {!manual&&customerId&&<section className="adminSection"><p className="eyebrow">Unpaid sessions</p><h2 style={{marginTop:0}}>Add past sessions</h2>
   {billable==='loading'?<p className={s.muted}>Loading sessions…</p>:billable?.error?<p className={s.message}>{billable.error}</p>:pending.length?<div className={s.history}>{pending.map(({kind,item})=>{const added=onInvoice(item.id);return <div className={s.historyRow} key={item.id}><span className={s.position}>{kind==='booking'?'B':'S'}</span><div><b>{uk(kind==='booking'?item.booking_date:item.session_date)} · {kind==='booking'?item.service_name:'Logged session'}</b><small>{kind==='booking'?`${String(item.start_time).slice(0,5)}–${String(item.end_time).slice(0,5)} · ${Number(item.duration_minutes)/60}h · ${money(item.due_pence)} unpaid`:`${Number(item.actual_hours)}h${item.engineer?` with ${item.engineer}`:''} · no payment recorded`}</small></div><button type="button" className={added?s.secondary:s.primary} disabled={added} onClick={()=>kind==='booking'?addBooking(item):addSession(item)}>{added?'Added ✓':'Add'}</button></div>;})}</div>:<p className={s.muted}>No unpaid sessions for this artist.</p>}
  </section>}

  <section className="adminSection"><p className="eyebrow">Lines</p>
   <div className={s.tableWrap}><table className={s.table}><thead><tr><th>Date</th><th>Service</th><th>Description</th><th>Qty / hrs</th><th>Rate £</th><th style={{textAlign:'right'}}>Amount</th><th></th></tr></thead><tbody>
    {lines.map(l=><tr key={l.key}>
     <td><input type="date" className={s.select} value={l.date||''} onChange={set(l.key,'date')} style={{width:140}}/></td>
     <td><input className={s.select} value={l.service} onChange={set(l.key,'service')} placeholder="e.g. Studio hire" style={{width:150}}/>{l.type!=='custom'&&<small>{l.type==='booking'?'From booking':'From session report'}</small>}</td>
     <td><input className={s.select} value={l.description} onChange={set(l.key,'description')} placeholder="Details" style={{width:230}}/></td>
     <td><input className={s.select} inputMode="decimal" value={l.qty} onChange={set(l.key,'qty')} style={{width:64}}/></td>
     <td><input className={s.select} inputMode="decimal" value={l.rate} onChange={set(l.key,'rate')} placeholder="0.00" style={{width:90}}/></td>
     <td data-sensitive="financial" style={{textAlign:'right'}}><b>{money(Math.round((Number(l.qty)||0)*Math.round((Number(l.rate)||0)*100)))}</b></td>
     <td><button type="button" className={s.danger} onClick={()=>setLines(ls=>ls.length>1?ls.filter(x=>x.key!==l.key):[blank()])} aria-label="Remove line">×</button></td>
    </tr>)}
   </tbody></table></div>
   <div className={s.row} style={{marginTop:10}}><button type="button" className={s.secondary} onClick={()=>setLines(ls=>[...ls,blank()])}>+ Add a line</button></div>
  </section>

  <section className="adminSection"><div className={s.settingsGrid}>
   <label className={s.field}><span>Due date</span><input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
   <label className={s.field}><span>Invoice title (optional)</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Mentoring — Elev8 Project"/></label>
   <label className={s.field} style={{gridColumn:'1/-1'}}><span>Notes on the invoice (optional)</span><textarea className={s.textarea} rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. PO number C2602PO00225"/></label>
  </div>
   {!bankComplete&&<p className={s.message}>Tip: add your bank details in Settings → Invoice payment details so they print on the invoice.</p>}
   <div className={s.feeBox} style={{marginTop:14}}><div><small>Invoice total</small><b data-sensitive="financial">{money(total)}</b></div><div className={s.row}><button type="button" className={s.secondary} disabled={busy} onClick={()=>save(false)}>Save draft</button><button type="button" className={s.primary} disabled={busy||total<30} onClick={()=>save(true)}>{busy?'Working…':'Save & email invoice'}</button></div></div>
   {msg&&<p className={s.message} role="status">{msg}</p>}
  </section>
 </div>;
}

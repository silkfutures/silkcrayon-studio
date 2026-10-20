'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './EngineerWork.module.css';

const money=p=>p==null?'No rate set':`£${(Number(p)/100).toFixed(Number(p)%100?2:0)}`;
const when=v=>{try{return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(new Date(v));}catch{return '';}};
const LABELS={awaiting:'Awaiting response',accepted:'Accepted',assigned:'Assigned directly',needs_owner:'Needs your approval',unfilled:'No engineer accepted'};
const OFFER_LABELS={queued:'Backup · waiting',sent:'Offer sent',accepted:'Accepted',declined:'Declined',expired:'Expired',cancelled:'Closed'};
const WINDOWS=[['','Default (auto)'],['1','1 hour'],['2','2 hours'],['6','6 hours'],['12','12 hours'],['24','24 hours'],['48','48 hours']];

function rateFor(staff,booking){const r=booking.supported_artist_id&&staff.engineer_supported_pay_hourly_pence!=null?staff.engineer_supported_pay_hourly_pence:staff.engineer_pay_hourly_pence;return r==null?null:Number(r);}

export default function EngineerOfferPanel({booking,offers=[],staff=[],settings}){
 const router=useRouter();
 const status=booking.engineer_offer_status||(booking.engineer_user_id?'assigned':null);
 const open=['awaiting','needs_owner'].includes(status);
 const [showForm,setShowForm]=useState(!booking.engineer_user_id&&!open);
 const dryHire=booking.service_slug==='dry-hire';
 const dryDefault=((settings?.dryHireAccessFeePence??2000)/100).toFixed(2);
 const [picked,setPicked]=useState([]),[windowHours,setWindowHours]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [sendMode,setSendMode]=useState('sequential');
 const [payMode,setPayMode]=useState(dryHire?'fixed':'usual'),[customHourly,setCustomHourly]=useState(''),[customFixed,setCustomFixed]=useState(dryHire?dryDefault:'');
 const hours=Number(booking.duration_minutes||0)/60;
 const toPence=v=>{const n=Number(v);return String(v).trim()!==''&&Number.isFinite(n)&&n>=0?Math.round(n*100):null;};
 function offeredFor(x){
  if(payMode==='fixed'){const f=toPence(customFixed);return f==null?'Enter the fixed fee':`${money(f)} fixed`;}
  if(payMode==='hourly'){const r=toPence(customHourly);return r==null?'Enter the hourly rate':`${money(r)}/h × ${hours}h = ${money(Math.round(r*hours))}`;}
  const rate=rateFor(x,booking);return rate==null?'No pay rate set — fee to be confirmed':`${money(rate)}/h × ${hours}h = ${money(Math.round(rate*hours))}`;
 }
 const payInvalid=(payMode==='fixed'&&toPence(customFixed)==null)||(payMode==='hourly'&&toPence(customHourly)==null);
 const live=offers.find(o=>o.status==='sent');
 const liveAll=offers.filter(o=>o.status==='sent');
 const nextQueued=offers.filter(o=>o.status==='queued').sort((a,b)=>a.position-b.position)[0];
 const latestRound=useMemo(()=>{const start=[...offers].reverse().findIndex(o=>o.position===1);return start<0?offers:offers.slice(offers.length-1-start);},[offers]);
 const earlier=offers.length-latestRound.length;

 function toggle(id){setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
 async function call(method,body,okText){
  setBusy(true);setMsg('Working…');
  try{const r=await fetch(`/api/admin/bookings/${booking.id}/offers`,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok===false){setMsg(j.error||'Could not update.');}
   else{setMsg(typeof okText==='function'?okText(j):okText);setPicked([]);setShowForm(false);router.refresh();}
  }catch{setMsg('Network problem — please retry.');}
  finally{setBusy(false);}
 }
 const send=()=>call('POST',{engineerUserIds:picked,windowHours:windowHours?Number(windowHours):null,mode:sendMode,fee:payMode==='fixed'?customFixed:null,hourly:payMode==='hourly'?customHourly:null},j=>j.state==='awaiting'?`Offer sent to ${j.broadcast?`${j.sentCount} engineers — first to accept gets it`:j.engineerName||'engineer'}${j.emailError?` — but the email failed (${j.emailError}). They can still respond from Studio OS.`:' ✓'}`:j.state==='needs_owner'?'Saved — needs your approval before the backup is offered.':'Saved.');

 const summary=status==='awaiting'&&liveAll.length>1?`Open to ${liveAll.length} engineers · first to accept gets it · closes ${when(live.expires_at)}`
  :status==='awaiting'&&live?`Waiting for ${live.engineer_name} · reply by ${when(live.expires_at)}`
  :status==='accepted'?`${booking.assigned_engineer} accepted${booking.engineer_accepted_at?` · ${when(booking.engineer_accepted_at)}`:''}`
  :status==='assigned'?`${booking.assigned_engineer||'Engineer'} assigned directly`
  :status==='needs_owner'?`The artist chose a specific engineer. Approve ${nextQueued?.engineer_name||'the next backup'} before they are offered the session.`
  :status==='unfilled'?'Every engineer declined or didn’t reply in time. Send a new offer or assign directly.'
  :'No engineer has been offered this session yet.';

 return <div className={s.panel}>
  <div className={s.statusRow}>{status?<span className={`${s.pill} ${s[status]||''}`}>{LABELS[status]}</span>:<span className={`${s.pill} ${s.queued}`}>Not offered</span>}{booking.engineer_fee_pence!=null&&booking.engineer_user_id&&<span className={s.muted} data-sensitive="financial">Engineer fee {money(booking.engineer_fee_pence)}</span>}</div>
  <p className={s.muted}>{summary}</p>

  {latestRound.length>0&&<div className={s.history}>{latestRound.map(o=><div className={s.historyRow} key={o.id}>
   <span className={s.position}>{o.position}</span>
   <div><b>{o.engineer_name}{o.round_mode==='broadcast'||o.position===1?'':' · backup'}</b><small>
    {o.status==='sent'&&`Sent ${when(o.sent_at)} · deadline ${when(o.expires_at)}`}
    {o.status==='queued'&&(o.requires_owner_approval&&!o.owner_approved_at?'Needs your approval before it is sent':'Next if the current offer is declined or expires')}
    {o.status==='accepted'&&`Accepted ${when(o.responded_at)}${o.response_via==='studio_os'?' in Studio OS':' from email'}`}
    {o.status==='declined'&&`Declined ${when(o.responded_at)}${o.decline_reason?` — “${o.decline_reason}”`:''}`}
    {o.status==='expired'&&`No reply by ${when(o.expires_at)}`}
    {o.status==='cancelled'&&(o.close_reason||'Closed')}
    {o.email_error&&` · email failed: ${o.email_error}`}
   </small><small data-sensitive="financial">{o.fee_pence==null?'Fee to be confirmed (no pay rate set)':`Fee ${money(o.fee_pence)}${o.fee_is_flat?' fixed':o.pay_hourly_pence!=null?` (${money(o.pay_hourly_pence)}/h)`:''}`}</small></div>
   <span className={`${s.pill} ${s[o.status]||''}`}>{OFFER_LABELS[o.status]}</span>
  </div>)}</div>}
  {earlier>0&&<p className={s.muted}>{earlier} earlier offer{earlier===1?'':'s'} in the activity history.</p>}

  <div className={s.row}>
   {status==='needs_owner'&&nextQueued&&<button className={s.primary} disabled={busy} onClick={()=>call('PATCH',{action:'approve_next',offerId:nextQueued.id},'Approved — offer sent ✓')}>Approve & offer {nextQueued.engineer_name}</button>}
   {open&&<button className={s.danger} disabled={busy} onClick={()=>{if(confirm('Stop all open offers for this session?'))call('PATCH',{action:'stop'},'Offers stopped.');}}>Stop offers</button>}
   {!showForm&&<button className={s.secondary} disabled={busy} onClick={()=>setShowForm(true)}>{booking.engineer_user_id||open?'Re-offer to someone else':'Offer session'}</button>}
  </div>

  {showForm&&<div className={s.form}>
   <b>Who should get it?</b>
   <div className={s.row}><label className={s.check}><input type="radio" checked={sendMode==='sequential'} onChange={()=>setSendMode('sequential')}/><span>One at a time — backups in order</span></label><label className={s.check}><input type="radio" checked={sendMode==='broadcast'} onChange={()=>setSendMode('broadcast')}/><span>Everyone at once — first to accept gets it</span></label></div>
   <p className={s.muted}>{sendMode==='broadcast'?'Everyone you tick gets the offer straight away with the same deadline. The first to accept takes it and the others’ offers close.':`Tick engineers in order: the first gets the offer, the rest are backups who are offered it automatically if the previous one declines or doesn’t reply.${booking.preferred_engineer_user_id?' This artist chose a specific engineer, so backups need your approval before they are offered.':''}`}</p>
   <div className={s.picker}>{staff.map(x=>{const i=picked.indexOf(x.user_id);return <label key={x.user_id} className={`${s.pickRow} ${i>=0?s.on:''}`}>
    <input type="checkbox" checked={i>=0} onChange={()=>toggle(x.user_id)}/>
    <span><b>{x.engineer_name||x.full_name}{booking.preferred_engineer_user_id===x.user_id?' ★ artist’s choice':''}</b><small data-sensitive="financial">{offeredFor(x)}{x.role==='owner'?' · owner':''}</small></span>
    <span className={s.order}>{i<0?'':sendMode==='broadcast'?'Included':i===0?'1st choice':`Backup ${i}`}</span>
   </label>;})}</div>
   <div className={s.row}>
    <label className={s.field}><span>What you’re offering</span><select className={s.select} value={payMode} onChange={e=>setPayMode(e.target.value)}>{!dryHire&&<option value="usual">Their usual rate</option>}<option value="hourly">Custom hourly rate</option><option value="fixed">{dryHire?'Fixed fee · open & close':'Fixed fee for the job'}</option></select><small>{dryHire?'Dry hire: the engineer just opens and locks up — no engineering.':payMode==='hourly'?'e.g. a lower rate for a full day. Any approved extra time is paid at this rate too.':payMode==='fixed'?'Paid exactly this amount, however long the session runs.':'From each engineer’s staff profile.'}</small></label>
    {payMode==='hourly'&&<label className={s.field} data-sensitive="financial"><span>£ per hour</span><input className={s.amountInput} inputMode="decimal" value={customHourly} onChange={e=>setCustomHourly(e.target.value)} placeholder="17.50"/></label>}
    {payMode==='fixed'&&<label className={s.field} data-sensitive="financial"><span>Fixed fee (£)</span><input className={s.amountInput} inputMode="decimal" value={customFixed} onChange={e=>setCustomFixed(e.target.value)} placeholder="20.00"/></label>}
   </div>
   <div className={s.row}>
    <label className={s.field}><span>Response window</span><select className={s.select} value={windowHours} onChange={e=>setWindowHours(e.target.value)}>{WINDOWS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><small>Auto = {settings?.windowHours}h, or {settings?.urgentWindowHours}h if the session is within {settings?.urgentThresholdHours}h. Offers always close {settings?.cutoffHours}h before the session.</small></label>
   </div>
   <div className={s.row}>
    <button className={s.primary} disabled={busy||!picked.length||payInvalid} onClick={send}>{busy?'Sending…':picked.length&&sendMode==='broadcast'?`Send to all ${picked.length} at once`:picked.length?`Send offer to ${staff.find(x=>x.user_id===picked[0])?.engineer_name||staff.find(x=>x.user_id===picked[0])?.full_name}${picked.length>1?` + ${picked.length-1} backup${picked.length>2?'s':''}`:''}`:'Choose an engineer'}</button>
    <button className={s.secondary} disabled={busy} onClick={()=>{setShowForm(false);setPicked([]);}}>Cancel</button>
   </div>
  </div>}
  {msg&&<p className={s.message} role="status">{msg}</p>}
 </div>;
}

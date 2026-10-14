'use client';
import {useState} from 'react';
export default function AnalyticsHealth({lastView,error}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function check(){setBusy(true);try{const r=await fetch('/api/admin/analytics/health',{method:'POST'}),j=await r.json();setMessage(j.message||j.error||'Check failed.');}catch{setMessage('Could not reach the tracking check. Try again.');}finally{setBusy(false);}}
 const stale=!lastView||Date.now()-new Date(lastView).getTime()>48*3600e3;
 return <section className={`analyticsHealth ${error||stale?'attention':''}`}><div><b>{error?'Visitor data unavailable':stale?'No visits recorded in the last 48 hours':'Recent visits are being recorded'}</b><p>{error?'The database query failed. The chart is hidden rather than showing misleading zeros.':lastView?`Last recorded visit: ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(lastView))}`:'No visits recorded in this period. This does not prove nobody visited.'}</p></div><button className="miniButton" disabled={busy} onClick={check}>{busy?'Checking…':'Check tracking'}</button>{message&&<p role="status">{message}</p>}</section>;
}

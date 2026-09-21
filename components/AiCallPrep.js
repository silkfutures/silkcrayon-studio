'use client';
import {useEffect,useState} from 'react';

function copyText(value,setMessage,label){navigator.clipboard?.writeText(value).then(()=>setMessage(`${label} copied ✓`)).catch(()=>setMessage('Could not copy. Select the text instead.'))}

export default function AiCallPrep({sourceType,sourceId,initialPrep=null,autoGenerate=false,phone=''}){
 const [prep,setPrep]=useState(initialPrep),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false);
 async function load(regenerate=false){
  setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/admin/ai/call-prep',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceType,sourceId,regenerate})}),body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Could not prepare this call.');setPrep(body.prep);if(body.prep?.useful)setOpen(true)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{if(autoGenerate&&!initialPrep)load(false)},[]); // source is fixed for the mounted card
 const questions=(prep?.questions||[]).join('\n');
 const phoneHref=String(phone||'').replace(/\s+/g,'');
 return <section className={`aiCallPrep ${prep?.useful?'ready':''}`}>
  <div className="aiCallPrepHead"><div><span className="aiPrepSpark">✦</span><div><small>SILKCRAYON ASSISTANT</small><h3>AI Call Prep</h3></div></div>{prep?.useful&&<span className="aiPrepReady">Ready</span>}</div>
  {!prep&&!busy&&<><p className="aiPrepIntro">Turn this customer’s details into a short briefing, the right questions and a natural phone script.</p><button className="button outline" type="button" onClick={()=>load(false)}>Create call prep</button></>}
  {busy&&<div className="aiPrepLoading"><span></span><p>Preparing the call…</p></div>}
  {error&&<div className="aiPrepError"><p>{error}</p><button type="button" onClick={()=>load(false)}>Try again</button></div>}
  {prep&&!prep.useful&&!busy&&<div className="aiPrepNotNeeded"><b>No full script needed</b><p>{prep.reason}</p><button type="button" onClick={()=>load(true)}>Generate anyway</button></div>}
  {prep?.useful&&!busy&&<>
   <div className="aiPrepBrief"><small>10-SECOND BRIEF</small><p>{prep.briefing}</p></div>
   <div className="aiPrepObjective"><small>CALL OBJECTIVE</small><p>{prep.objective}</p></div>
   {prep.expectation&&<div className="aiPrepBoundary"><b>Important expectation</b><p>{prep.expectation}</p></div>}
   <div className="aiPrepActions">{phoneHref&&<a className="button primary" href={`tel:${phoneHref}`}>Call customer</a>}<button className="button outline" type="button" onClick={()=>setOpen(x=>!x)}>{open?'Hide full guide':'Open full guide'}</button></div>
   {open&&<div className="aiPrepFull">
    {prep.questions?.length>0&&<section><div className="aiPrepSectionHead"><h4>Questions to establish</h4><button type="button" onClick={()=>copyText(questions,setMessage,'Questions')}>Copy</button></div><ol>{prep.questions.map((item,index)=><li key={index}>{item}</li>)}</ol></section>}
    <section><div className="aiPrepSectionHead"><h4>Suggested call script</h4><button type="button" onClick={()=>copyText(prep.script,setMessage,'Script')}>Copy</button></div><div className="aiPrepScript">{prep.script}</div></section>
    {prep.preparation?.length>0&&<section><h4>Prepare before the session</h4><ul>{prep.preparation.map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
    {prep.after_call?.length>0&&<section><h4>After the call</h4><ul className="aiPrepChecklist">{prep.after_call.map((item,index)=><li key={index}><label><input type="checkbox"/> <span>{item}</span></label></li>)}</ul></section>}
   </div>}
   <div className="aiPrepFooter"><button type="button" disabled={busy} onClick={()=>load(true)}>Regenerate</button>{message&&<span>{message}</span>}</div>
  </>}
 </section>
}

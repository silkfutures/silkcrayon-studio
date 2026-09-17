'use client';

import {useState} from 'react';
import styles from './MixReviewActions.module.css';

export default function PublicMixReviewActions({token,initialStatus,revisionCount=0,includedRevisions=0}){
  const [status,setStatus]=useState(initialStatus);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [usedRevisions,setUsedRevisions]=useState(Number(revisionCount||0));
  const awaiting=['first_mix_sent','revisions'].includes(status);
  const canRevise=awaiting&&usedRevisions<Number(includedRevisions||0);

  async function act(body){
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/mix-review/${encodeURIComponent(token)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not save your review.');
      if(body.action==='approve')setStatus('approved');
      if(body.action==='revision'){setStatus('revisions');setUsedRevisions(current=>current+1);setMessage('Revision request sent ✓ The studio has been notified.');}
    }catch(error){setMessage(error.message||'Could not save your review.')}finally{setBusy(false)}
  }

  if(status==='approved'||status==='delivered')return <div className={styles.reviewCard}><div className={styles.approved}><b>Mix approved ✓</b><span>Silkcrayon has been notified. You’re all set on this version.</span></div></div>;
  if(!awaiting)return null;

  return <section className={styles.reviewCard}>
    <div className={styles.reviewIntro}><small>YOUR REVIEW</small><h2>How’s the mix feeling?</h2><p>If it sounds right, approve it and we’ll know this version is locked. Only open a revision request if there’s a specific change you need.</p></div>
    <button type="button" className={styles.approve} disabled={busy} onClick={()=>{if(window.confirm('Approve this mix as the version you are happy with?'))act({action:'approve'})}}><span>{busy?'Saving…':'Approve mix'}</span><span>✓</span></button>
    {canRevise?<details className={styles.changeDetails}><summary>Need a specific change?</summary><form className={styles.changeBody} onSubmit={event=>{event.preventDefault();const form=event.currentTarget,notes=new FormData(form).get('notes');act({action:'revision',notes}).then(()=>form.reset())}}><p>Keep it focused: note the exact change and add a timestamp where useful. You have {Math.max(0,Number(includedRevisions)-usedRevisions)} included revision round{Math.max(0,Number(includedRevisions)-usedRevisions)===1?'':'s'} remaining.</p><textarea name="notes" required maxLength="3000" placeholder="e.g. 1:12 — bring the lead vocal slightly forward. 2:03 — reduce the delay throw."/><button className={styles.changeButton} disabled={busy}>Send revision request</button></form></details>:<div className={styles.limit}>Your included revision allowance has been used. If something still needs attention, contact the studio directly and we’ll work out the best next step.</div>}
    {message&&<p className={styles.status}>{message}</p>}
  </section>;
}

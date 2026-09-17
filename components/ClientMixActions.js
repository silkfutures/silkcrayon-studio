'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './MixReviewActions.module.css';

export default function ClientMixActions({job,revisions}){
  const router=useRouter();
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const canReview=['first_mix_sent','revisions'].includes(job.status);
  const canRevise=canReview&&revisions.length<job.included_revisions;

  async function act(body){
    setBusy(true);setMsg('');
    try{
      const response=await fetch(`/api/customer/mixes/${job.id}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not save.');
      setMsg(body.action==='approve'?'Mix approved ✓ The studio has been notified.':'Revision request sent ✓ The studio has been notified.');
      router.refresh();
    }catch(error){setMsg(error.message||'Could not save.')}finally{setBusy(false)}
  }

  if(job.status==='approved'||job.status==='delivered')return <div className={styles.reviewCard}><div className={styles.approved}><b>Mix approved ✓</b><span>Silkcrayon has been notified. You’re all set on this version.</span></div></div>;
  if(!canReview)return null;

  return <div className={styles.reviewCard}>
    <div className={styles.reviewIntro}><small>YOUR REVIEW</small><h2>Ready to lock it?</h2><p>If the mix feels right, approve it. If there’s one specific thing to adjust, revision requests are available underneath.</p></div>
    <button type="button" className={styles.approve} disabled={busy} onClick={()=>{if(window.confirm('Approve this mix as the version you are happy with?'))act({action:'approve'})}}><span>{busy?'Saving…':'Approve mix'}</span><span>✓</span></button>
    {canRevise?<details className={styles.changeDetails}><summary>Need a specific change?</summary><form className={styles.changeBody} onSubmit={event=>{event.preventDefault();const form=event.currentTarget,notes=new FormData(form).get('notes');act({action:'revision',notes}).then(()=>form.reset())}}><p>Keep it focused and add timestamps where useful. {job.included_revisions-revisions.length} included revision round{job.included_revisions-revisions.length===1?'':'s'} remaining.</p><textarea name="notes" rows="5" required maxLength="3000" placeholder="e.g. 1:12 — bring the lead vocal slightly forward."/><button className={styles.changeButton} disabled={busy}>Send revision request</button></form></details>:<div className={styles.limit}>Your included revision allowance has been used. Contact the studio if something still needs attention.</div>}
    {msg&&<p className={styles.status}>{msg}</p>}
  </div>;
}

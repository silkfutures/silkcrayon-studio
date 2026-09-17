const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

export const mixServiceLabels={
  mix_only:'Mix only',
  mix_master:'Mix + master',
  master_only:'Master only',
  not_sure:'Mixing / mastering'
};

export function canonicalSiteUrl(){
  const configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');
  if(!configured||/\.vercel\.app(?:\/|$)/i.test(configured))return 'https://silkcrayon.com';
  return configured;
}

function processSteps(serviceType,{vocalTuningEditing=false}={}){
  const cleanup=vocalTuningEditing
    ? 'We’ll clean and tighten the session first, including the agreed vocal tuning / editing work where needed.'
    : 'We’ll clean and organise the session first: sensible edits, fades and preparation before the creative mix begins.';
  const mix='For the mix, we shape the balance and tone with level, EQ, compression, effects such as reverb / delay, and automation so the record feels clear, intentional and cohesive.';
  const master=serviceType==='mix_master'
    ? 'Because mastering is included, we’ll also do the final release pass: overall tone, loudness and translation so the finished track holds together across headphones, cars, speakers and streaming services.'
    : serviceType==='master_only'
      ? 'Mastering is the final release pass: overall tone, loudness and translation so the finished track holds together across headphones, cars, speakers and streaming services.'
      : 'If mastering is not part of this quote, we’ll stop at the approved mix rather than quietly adding extra work or cost.';
  return [cleanup,mix,master];
}

export function mixSetupEmail({job,customer,tracks=[],outstandingPence=0,paymentUrl=null,dueDate=null}={}){
  const artist=escapeHtml(customer?.artist_name||customer?.full_name||'there');
  const titles=(tracks.length?tracks:[job?.track_title]).filter(Boolean).map(escapeHtml);
  const titleText=titles.join(', ')||'your project';
  const service=mixServiceLabels[job?.service_type]||'Mixing / mastering';
  const turnaround=escapeHtml(job?.turnaround_text||'7 working days from payment and complete files');
  const revisions=Math.max(0,Number(job?.included_revisions??1));
  const due=dueDate?`<br><span style="color:#9f96a5">Due ${escapeHtml(new Date(`${dueDate}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}))}</span>`:'';
  const amount=Number(outstandingPence)>0?`£${(Number(outstandingPence)/100).toFixed(2)}`:null;
  const [step1,step2,step3]=processSteps(job?.service_type,{vocalTuningEditing:job?.vocal_tuning_editing});
  const paymentBlock=paymentUrl&&amount
    ? `<div style="margin:26px 0;padding:20px;border:1px solid #4b3966;background:#0d0914"><div style="font-size:11px;letter-spacing:2px;color:#C394FF;font-weight:800">READY FOR PAYMENT</div><p style="font-size:28px;color:#fff;margin:10px 0 4px"><b>${amount}</b></p><p style="color:#bdb4c3;margin-top:0">Payment confirms the project and puts it into the active mix queue.${due}</p><p style="margin:20px 0 0"><a href="${paymentUrl}" style="display:block;text-align:center;background:#C394FF;color:#0c0710;padding:15px 18px;text-decoration:none;font-weight:900;border-radius:8px">PAY &amp; START THE MIX →</a></p></div>`
    : `<div style="margin:26px 0;padding:20px;border:1px solid #314438;background:#0b120d"><div style="font-size:11px;letter-spacing:2px;color:#98e3ae;font-weight:800">PAYMENT CONFIRMED</div><p style="color:#d6dfd8;margin-bottom:0">You’re in the active mix queue. No payment action is needed.</p></div>`;
  const portal=`${canonicalSiteUrl()}/account/login`;
  return {
    subject:paymentUrl?`Your Silkcrayon mix is set up — payment & what to expect`:`Your Silkcrayon mix is confirmed — what to expect`,
    html:`<!doctype html><html><body style="margin:0;background:#08070a;color:#f7f3fa;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:40px 20px"><div style="color:#C394FF;font-size:11px;letter-spacing:3px;font-weight:800">SILKCRAYON STUDIOS</div><h1 style="font-size:36px;line-height:1.05;margin:18px 0">Your mix is set up.</h1><p style="color:#c8c1cc;line-height:1.7">Hi ${artist}, we’ve set up <b style="color:#fff">${titleText}</b> in the Silkcrayon mix system. Here’s exactly what happens next.</p><div style="margin:24px 0;padding:20px;border:1px solid #332b3b;background:#0d0a10"><p style="margin:0 0 10px"><b style="color:#fff">${escapeHtml(service)}</b></p><p style="margin:5px 0;color:#c8c1cc"><b style="color:#fff">Turnaround:</b> ${turnaround}</p><p style="margin:5px 0;color:#c8c1cc"><b style="color:#fff">Included revisions:</b> ${revisions} focused round${revisions===1?'':'s'}</p></div>${paymentBlock}<div style="margin:28px 0"><div style="font-size:11px;letter-spacing:2px;color:#C394FF;font-weight:800;margin-bottom:14px">WHAT TO EXPECT</div><div style="border-top:1px solid #332b3b;padding:16px 0"><b style="color:#fff">01 · Prep & cleanup</b><p style="color:#bfb6c5;line-height:1.65;margin-bottom:0">${escapeHtml(step1)}</p></div><div style="border-top:1px solid #332b3b;padding:16px 0"><b style="color:#fff">02 · The mix</b><p style="color:#bfb6c5;line-height:1.65;margin-bottom:0">${escapeHtml(step2)}</p></div><div style="border-top:1px solid #332b3b;padding:16px 0"><b style="color:#fff">03 · ${job?.service_type==='master_only'?'Mastering':'Finish / mastering'}</b><p style="color:#bfb6c5;line-height:1.65;margin-bottom:0">${escapeHtml(step3)}</p></div><div style="border-top:1px solid #332b3b;padding:16px 0"><b style="color:#fff">04 · Review</b><p style="color:#bfb6c5;line-height:1.65;margin-bottom:0">We’ll send a private review link. If the mix feels right, the main action is simply <b style="color:#fff">Approve mix</b>. If one specific thing genuinely needs changing, you can open the revision option and send focused notes with timestamps where useful.</p></div></div><p style="color:#9f96a5;font-size:13px;line-height:1.6"><b style="color:#fff">Turnaround starts once payment and the complete files we need are both in.</b> If anything is missing, we’ll contact you rather than letting the clock run while the project is incomplete.</p><p><a href="${portal}" style="color:#C394FF;font-weight:800">Open My Studio →</a></p><p style="border-top:1px solid #302b35;margin-top:34px;padding-top:18px;color:#817a85;font-size:12px">Silkcrayon Studios · Cardiff Bay</p></div></body></html>`
  };
}

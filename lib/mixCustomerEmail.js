const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

export const mixServiceLabels={
  mix_only:'Mix only',
  mix_master:'Mix & Master',
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
    ? 'We’ll clean and tighten the session first, including the agreed vocal tuning and editing where needed.'
    : 'We’ll clean and organise the session first: sensible edits, fades and preparation before the creative mix begins.';
  const mix=serviceType==='master_only'
    ? 'Because this is a master-only job, we’ll work from the finished stereo mix you supply rather than rebuilding the balance from stems.'
    : 'For the mix, we shape balance and tone using level, EQ, compression, effects such as reverb and delay, and automation so the record feels clear, intentional and cohesive.';
  const master=serviceType==='mix_master'
    ? 'Mastering is included. We’ll make the final release pass for overall tone, loudness and translation so the finished track holds together across headphones, cars, speakers and streaming services.'
    : serviceType==='master_only'
      ? 'Mastering is the final release pass: overall tone, loudness and translation so the finished track holds together across headphones, cars, speakers and streaming services.'
      : 'Mastering is not included in this quote. We’ll stop at the approved mix rather than quietly adding extra work or cost.';
  return [cleanup,mix,master];
}

const card=(label,value)=>`<td class="stack" width="50%" valign="top" style="padding:0 6px 12px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#111015;border:1px solid #2e2933;border-radius:10px"><tr><td style="padding:15px 16px"><div style="font-size:10px;letter-spacing:1.8px;color:#9b8fa3;text-transform:uppercase;font-weight:700">${label}</div><div style="margin-top:7px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700">${value}</div></td></tr></table></td>`;

export function mixSetupEmail({job,customer,tracks=[],outstandingPence=0,paymentUrl=null,dueDate=null}={}){
  const artist=escapeHtml(customer?.artist_name||customer?.full_name||'there');
  const titles=(tracks.length?tracks:[job?.track_title]).filter(Boolean).map(escapeHtml);
  const titleText=titles.join(', ')||'Your project';
  const service=mixServiceLabels[job?.service_type]||'Mix & Master';
  const turnaround=escapeHtml(job?.turnaround_text||'7 working days from payment and complete files');
  const revisions=Math.max(0,Number(job?.included_revisions??1));
  const dueText=dueDate?escapeHtml(new Date(`${dueDate}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'})):null;
  const amount=Number(outstandingPence)>0?`£${(Number(outstandingPence)/100).toFixed(2)}`:null;
  const [step1,step2,step3]=processSteps(job?.service_type,{vocalTuningEditing:job?.vocal_tuning_editing});
  const portal=`${canonicalSiteUrl()}/account/login`;
  const paymentBlock=paymentUrl&&amount
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 28px;border-collapse:separate;background:#120d19;border:1px solid #523d69;border-radius:12px"><tr><td style="padding:22px"><div style="font-size:10px;letter-spacing:2px;color:#c394ff;font-weight:800">READY FOR PAYMENT</div><div style="font-size:30px;line-height:1.1;color:#ffffff;font-weight:900;margin:9px 0 6px">${amount}</div><div style="font-size:14px;line-height:1.6;color:#c9c0cd">Payment confirms the project and places it in the active queue.${dueText?`<br>Due ${dueText}.`:''}</div><table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:18px"><tr><td bgcolor="#c394ff" style="border-radius:9px"><a href="${paymentUrl}" style="display:inline-block;padding:14px 22px;color:#0b0710;text-decoration:none;font-weight:900;font-size:14px">PAY &amp; START THE MIX →</a></td></tr></table></td></tr></table>`
    : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 28px;border-collapse:separate;background:#0d1510;border:1px solid #31513a;border-radius:12px"><tr><td style="padding:20px 22px"><div style="font-size:10px;letter-spacing:2px;color:#98e3ae;font-weight:800">PAYMENT CONFIRMED</div><div style="margin-top:7px;font-size:14px;line-height:1.6;color:#d6dfd8">You’re in the active mix queue. No payment action is needed.</div></td></tr></table>`;

  const step=(num,label,body)=>`<tr><td style="padding:0 0 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr><td width="34" valign="top" style="font-size:11px;color:#c394ff;font-weight:800;padding-top:2px">${num}</td><td valign="top"><div style="font-size:15px;line-height:1.35;color:#ffffff;font-weight:800">${label}</div><div style="margin-top:6px;font-size:14px;line-height:1.65;color:#bfb6c5">${escapeHtml(body)}</div></td></tr></table></td></tr>`;

  const headline=titles.length===1?`“${titles[0]}” — ${escapeHtml(service)}`:`${titles.length} tracks — ${escapeHtml(service)}`;
  return {
    subject:paymentUrl?`${service}: ${titleText} — payment & next steps`:`${service}: ${titleText} — confirmed`,
    html:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media(max-width:620px){.shell{padding:22px 14px!important}.card{padding:22px!important}.stack{display:block!important;width:100%!important;padding-right:0!important}.title{font-size:28px!important}.btn a{display:block!important;text-align:center!important}}</style></head><body style="margin:0;padding:0;background:#070608;color:#f7f3fa;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#070608"><tr><td class="shell" align="center" style="padding:38px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border-collapse:separate;background:#0b0a0d;border:1px solid #28242c;border-radius:14px"><tr><td class="card" style="padding:34px"><div style="font-size:10px;letter-spacing:3px;color:#c394ff;font-weight:800">SILKCRAYON STUDIOS</div><h1 class="title" style="margin:14px 0 10px;font-size:34px;line-height:1.08;color:#ffffff">${headline}</h1><p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#c9c1ce">Hi ${artist}, your project is now set up in the Silkcrayon mix system. Here’s what happens next.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>${card('Turnaround',turnaround)}${card('Included revisions',`${revisions} focused round${revisions===1?'':'s'}`)}</tr></table>${paymentBlock}<div style="font-size:10px;letter-spacing:2px;color:#c394ff;font-weight:800;margin:4px 0 18px">WHAT TO EXPECT</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${step('01','Prep & cleanup',step1)}${step('02',job?.service_type==='master_only'?'Source check':'The mix',step2)}${step('03',job?.service_type==='master_only'?'Mastering':job?.service_type==='mix_master'?'Mastering':'Finish',step3)}${step('04','Review','We’ll send a private review link. If it feels right, the main action is Approve mix. If one specific thing genuinely needs changing, you can open the revision option and send focused notes with timestamps where useful.')}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:4px;border-collapse:separate;background:#100e12;border:1px solid #2d2931;border-radius:10px"><tr><td style="padding:17px 18px;font-size:13px;line-height:1.65;color:#aba3af"><b style="color:#ffffff">When does turnaround begin?</b><br>Once payment and the complete files we need are both in. If anything is missing, we’ll contact you rather than letting the clock run while the project is incomplete.</td></tr></table><p style="margin:24px 0 0"><a href="${portal}" style="color:#c394ff;font-weight:800;text-decoration:none">Open My Studio →</a></p><p style="border-top:1px solid #28242c;margin:28px 0 0;padding-top:16px;color:#77717b;font-size:11px;line-height:1.5">Silkcrayon Studios · Cardiff Bay</p></td></tr></table></td></tr></table></body></html>`
  };
}

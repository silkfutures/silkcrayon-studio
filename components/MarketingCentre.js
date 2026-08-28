"use client";
import {useState} from 'react';
const templates=[
 {id:'payday-relaunch',name:'Studio Offer',desc:'A strong offer-led campaign with a clear price and CTA.'},
 {id:'announcement',name:'Announcement',desc:'For studio news, launches and important updates.'},
 {id:'simple',name:'Simple Message',desc:'A clean personal note from Silkcrayon.'}
];
const initial={name:'Payday Studio Relaunch — 2 Hours £90',subject:'Silkcrayon is back — 2 hours for £90',preheader:'A little something to mark the studio relaunch.',headline:'We’re back.',body:'Over the last few weeks, we’ve been quietly rebuilding Silkcrayon.\n\nThe studio is open, the diary is live, and we’ve made it much easier to book your sessions and keep track of your studio time.\n\nTwo hours in the studio with an engineer. Record a new track, finish something that’s been sitting on your laptop, work on vocals, or just come and create.\n\nYou can choose your session time when you buy, or bank the two hours and book them when you’re ready.\n\nSame studio. Same focus on making your music sound right. Just a much better way of doing things.\n\nSee you in the studio,\nNathan',ctaLabel:'BOOK 2 HOURS FOR £90',ctaUrl:'https://silkcrayon.com/booking?service=vocal-recording',imageUrl:'',imageAlt:'Silkcrayon Studios',template:'payday-relaunch',testEmail:'info@silkcrayon.com',scheduledAt:''};

export default function MarketingCentre({contacts=[],campaigns=[]}){
 const [sync,setSync]=useState(''),[copyMsg,setCopyMsg]=useState(''),[state,setState]=useState('idle'),[form,setForm]=useState(initial),[device,setDevice]=useState('phone'),[audienceMode,setAudienceMode]=useState('all'),[query,setQuery]=useState(''),[selectedIds,setSelectedIds]=useState([]);
 function set(k,v){setForm(f=>({...f,[k]:v}))}
 const subscribed=contacts.filter(c=>c.marketing_status==='subscribed'&&c.marketing_consent===true);
 const previous=contacts.filter(c=>c.is_previous_customer);
 const base=audienceMode==='previous'?previous:audienceMode==='subscribers'?subscribed:audienceMode==='custom'?contacts:contacts;
 const shown=base.filter(c=>!query||[c.full_name,c.email,c.source,...(c.labels||[])].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
 const selected=audienceMode==='custom'?contacts.filter(c=>selectedIds.includes(c.id)):base;
 const sendEligible=selected.filter(c=>c.marketing_status==='subscribed'&&c.marketing_consent===true);
 const unknown=contacts.filter(c=>['unknown',null,undefined].includes(c.marketing_status)&&!c.marketing_consent).length;
 const optedOut=contacts.filter(c=>['unsubscribed','never_subscribed'].includes(c.marketing_status)).length;
 function chooseMode(mode){setAudienceMode(mode);setQuery('');setSync('');if(mode!=='custom')setSelectedIds([])}
 function toggle(id){setSelectedIds(xs=>xs.includes(id)?xs.filter(x=>x!==id):[...xs,id])}
 async function copyEmails(rows=selected){
  const emails=[...new Set(rows.map(c=>String(c.email||'').trim().toLowerCase()).filter(Boolean))];
  if(!emails.length){setCopyMsg('No email addresses in this audience.');return}
  const text=emails.join(', ');
  try{await navigator.clipboard.writeText(text);setCopyMsg(`Copied ${emails.length} email${emails.length===1?'':'s'} — paste them into Gmail BCC.`)}
  catch{const el=document.createElement('textarea');el.value=text;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();setCopyMsg(`Copied ${emails.length} emails — paste them into Gmail BCC.`)}
  setTimeout(()=>setCopyMsg(''),5000);
 }
 function selectShown(){const ids=shown.map(c=>c.id);setSelectedIds(xs=>[...new Set([...xs,...ids])])}
 async function uploadImage(file){if(!file)return;setState('image');const fd=new FormData();fd.append('image',file);const r=await fetch('/api/admin/marketing/image',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));setState('idle');if(!r.ok)return alert(j.error||'Image upload failed.');set('imageUrl',j.url)}
 async function syncNow(){setSync('Syncing…');const r=await fetch('/api/admin/marketing/sync',{method:'POST'});const j=await r.json().catch(()=>({}));setSync(r.ok?`${j.eligible} eligible · ${j.created} added · ${j.existing} already in Resend${j.failed?` · ${j.failed} failed`:''}`:(j.error||'Sync failed'))}
 async function act(action){
  if(action==='send'&&!confirm(`Send this campaign to ${sendEligible.length} marketing-eligible contacts?`))return;
  if(action==='schedule'&&!confirm(`Schedule this campaign for ${form.scheduledAt}?`))return;
  setState(action);const r=await fetch('/api/admin/marketing/broadcast',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...form,action})});const j=await r.json().catch(()=>({}));setState('idle');
  if(!r.ok)return alert(j.error||'Could not create campaign.');
  if(action==='test')alert(`Test sent to ${form.testEmail}. Check it on your actual phone before sending.`);
  else if(action==='draft')alert('Draft saved in Resend.');
  else if(action==='schedule')alert('Campaign scheduled in Resend.');
  else alert(`Broadcast created for ${j.recipientCount} eligible contacts.`);
 }
 const modes=[
  ['all','All contacts',contacts.length,'Everyone in Studio OS with an email address.'],
  ['previous','Previous customers',previous.length,'Booking history plus legacy Wix booking/session records.'],
  ['subscribers','Email subscribers',subscribed.length,'Contacts with recorded email marketing permission.'],
  ['custom','Custom selection',selectedIds.length,'Search and hand-pick contacts.']
 ];
 return <div className="marketingCentre marketingV2">
  <section className="marketingSetup audienceBuilder">
   <div className="audienceHeading"><div><p className="eyebrow">00 · Audience</p><h2>Who should receive this?</h2><p className="muted">Select the people you want to work with. Marketing permission remains visible separately.</p></div><div className="audienceTotal"><strong>{contacts.length}</strong><span>contacts with email</span></div></div>
   <div className="audienceModeGrid">{modes.map(([id,name,count,desc])=><button type="button" key={id} className={`audienceMode ${audienceMode===id?'active':''}`} onClick={()=>chooseMode(id)}><div><b>{name}</b><small>{desc}</small></div><strong>{count}</strong></button>)}</div>
   <div className="audienceStats"><span><b>{subscribed.length}</b> email permission</span><span><b>{previous.length}</b> previous customers</span><span><b>{unknown}</b> unknown / not asked</span><span><b>{optedOut}</b> declined / unsubscribed</span></div>
   <div className="audienceSelected"><div><small>SELECTED</small><b>{selected.length} contacts</b><span>{sendEligible.length} currently eligible for Resend marketing</span></div><div className="audienceSelectedActions"><button type="button" className="miniButton solid" disabled={!selected.length} onClick={()=>copyEmails(selected)}>Copy {selected.length} emails</button><button type="button" className="miniButton" onClick={syncNow}>Sync eligible subscribers</button></div></div>{copyMsg&&<div className="copyEmailNotice">{copyMsg}</div>}
   <details className="audiencePeople" open={audienceMode==='custom'}><summary>View / choose contacts <span>{shown.length} shown</span></summary><div className="audienceToolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email, source or label…"/><button type="button" className="miniButton" disabled={!shown.length} onClick={()=>copyEmails(shown)}>Copy shown</button>{audienceMode==='custom'&&<><button type="button" className="miniButton" onClick={selectShown}>Select all shown</button><button type="button" className="miniButton" onClick={()=>setSelectedIds([])}>Clear</button></>}</div><div className="audienceList">{shown.map(c=><label className="audiencePerson" key={c.id}>{audienceMode==='custom'&&<input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggle(c.id)}/>}<div><b>{c.full_name}</b><small>{c.email}</small></div>{c.is_previous_customer&&<em>Previous customer</em>}<span className={`permissionPill ${c.marketing_status==='subscribed'&&c.marketing_consent?'yes':'no'}`}>{c.marketing_status==='subscribed'&&c.marketing_consent?'Email permission':(c.marketing_status||'unknown').replaceAll('_',' ')}</span></label>)}</div></details>
   {sync&&<small className="audienceSyncResult">{sync}</small>}
  </section>

  <section className="templatePicker"><div><p className="eyebrow">01 · Campaign type</p><h2>What are you sending?</h2></div><div className="templateCards">{templates.map(t=><button type="button" key={t.id} className={`templateCard ${form.template===t.id?'active':''}`} onClick={()=>set('template',t.id)}><b>{t.name}</b><small>{t.desc}</small></button>)}</div></section>

  <section className="campaignComposer">
   <div className="campaignFields"><p className="eyebrow">02 · Content</p>
    <label>Internal campaign name<input value={form.name} onChange={e=>set('name',e.target.value)}/></label><label>Subject<input value={form.subject} onChange={e=>set('subject',e.target.value)}/></label><label>Inbox preview text<input value={form.preheader} onChange={e=>set('preheader',e.target.value)}/></label><label>Headline<input value={form.headline} onChange={e=>set('headline',e.target.value)}/></label><label>Message<textarea rows="11" value={form.body} onChange={e=>set('body',e.target.value)}/></label>
    <div className="campaignImageField"><label>Campaign image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadImage(e.target.files?.[0])}/></label>{form.imageUrl&&<div className="campaignImageReady"><img src={form.imageUrl} alt="Campaign"/><div><b>Image ready</b><button type="button" onClick={()=>set('imageUrl','')}>Remove</button></div></div>}<label>Image description <small>(accessibility)</small><input value={form.imageAlt} onChange={e=>set('imageAlt',e.target.value)} placeholder="Inside Silkcrayon Studios"/></label></div>
    <div className="campaignCta"><label>Button text<input value={form.ctaLabel} onChange={e=>set('ctaLabel',e.target.value)}/></label><label>Button URL<input value={form.ctaUrl} onChange={e=>set('ctaUrl',e.target.value)}/></label></div>
   </div>
   <div className="campaignPreview"><div className="previewHead"><small>03 · PREVIEW</small><div><button type="button" className={device==='phone'?'active':''} onClick={()=>setDevice('phone')}>Phone</button><button type="button" className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>Desktop</button></div></div><div className={`emailDevice ${device}`}><div className="emailViewport"><div className="emailBrand">SILKCRAYON STUDIOS · CARDIFF BAY</div><div className="emailCanvas">{form.imageUrl&&<img className="campaignPreviewImage" src={form.imageUrl} alt={form.imageAlt||""}/>}<small>{form.template==='payday-relaunch'?'STUDIO RELAUNCH':form.template==='announcement'?'SILKCRAYON UPDATE':'FROM THE STUDIO'}</small><h2>{form.headline}</h2>{form.template==='payday-relaunch'&&<div className="emailOffer"><b>2 HOURS</b><strong>£90</strong><s>Usually £100</s></div>}<p>Hi Nathan,</p>{form.body.split(/\n{2,}/).map((x,i)=><p key={i}>{x}</p>)}{form.ctaLabel&&<span className="emailCta">{form.ctaLabel} →</span>}<footer>Silkcrayon Studios · Cardiff Bay<br/>Unsubscribe</footer></div></div></div></div>
  </section>

  <section className="campaignLaunch"><div><p className="eyebrow">04 · Test & send</p><h2>See it in a real inbox first.</h2><p className="muted">The preview is a guide. The test email is the source of truth.</p></div><div className="testSendRow"><input type="email" value={form.testEmail} onChange={e=>set('testEmail',e.target.value)}/><button className="miniButton" disabled={state!=='idle'} onClick={()=>act('test')}>Send test email</button></div><div className="scheduleRow"><input type="datetime-local" value={form.scheduledAt} onChange={e=>set('scheduledAt',e.target.value)}/><button className="miniButton" disabled={!form.scheduledAt||state!=='idle'} onClick={()=>act('schedule')}>Schedule</button></div><div className="campaignActions"><button className="miniButton" disabled={state!=='idle'} onClick={()=>act('draft')}>Save draft</button><button className="miniButton solid" disabled={!sendEligible.length||state!=='idle'} onClick={()=>act('send')}>Send to {sendEligible.length} eligible subscribers</button></div></section>
  <section className="campaignHistory"><p className="eyebrow">History</p><h2>Campaigns</h2>{campaigns.length?campaigns.map(c=><div className="campaignRow" key={c.id}><div><b>{c.name}</b><small>{c.subject}</small></div><span>{c.status}</span><span>{c.recipient_count} recipients</span><small>{new Date(c.created_at).toLocaleString('en-GB')}</small></div>):<p className="muted">No campaigns yet.</p>}</section>
 </div>
}

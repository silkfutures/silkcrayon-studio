"use client";
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';

function client(){return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
export default function SessionDeliveryPanel({bookingId}){
 const [mode,setMode]=useState('link'),[url,setUrl]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function send(){
  if(mode==='link'&&!url.trim())return setMsg('Paste the file link first.');
  if(mode==='upload'&&!file)return setMsg('Choose a file first.');
  setBusy(true);setMsg(mode==='upload'?'Preparing upload…':'Sending files…');
  try{
   let payload={action:'deliver_link',externalUrl:url.trim()};
   if(mode==='upload'){
    const prep=await fetch(`/api/admin/bookings/${bookingId}/delivery`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'prepare_upload',fileName:file.name,contentType:file.type||'application/octet-stream'})});
    const pj=await prep.json();if(!prep.ok)throw new Error(pj.error||'Could not prepare upload.');
    setMsg('Uploading file…');
    const {error}=await client().storage.from(pj.bucket).uploadToSignedUrl(pj.path,pj.token,file,{contentType:file.type||'application/octet-stream'});if(error)throw error;
    payload={action:'deliver_upload',storagePath:pj.path,fileName:file.name};
   }
   setMsg('Notifying customer…');
   const r=await fetch(`/api/admin/bookings/${bookingId}/delivery`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not send files.');
   setMsg(`Files sent ✓${j.smsSent?' text + email':' email'}`);setUrl('');setFile(null);
  }catch(e){setMsg(e.message||'Could not send files.')}finally{setBusy(false)}
 }
 return <div className="sessionDeliveryPanel"><div className="deliveryMode"><button type="button" className={mode==='link'?'active':''} onClick={()=>setMode('link')}>Paste link</button><button type="button" className={mode==='upload'?'active':''} onClick={()=>setMode('upload')}>Upload file</button></div>{mode==='link'?<label className="field"><span>Files link</span><input type="url" placeholder="Google Drive, Dropbox, WeTransfer…" value={url} onChange={e=>setUrl(e.target.value)}/></label>:<label className="deliveryFile"><span>Choose finished file</span><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>Uploads go directly to secure studio storage, not through the web server.</small></label>}<button type="button" className="engPrimaryAction buttonLike" disabled={busy} onClick={send}>{busy?'Working…':'Send files to customer'} <span>→</span></button>{msg&&<p className="deliveryMessage">{msg}</p>}<p className="tiny muted">This sends a transactional Silkcrayon email and, where a phone number is available, a text saying their files are ready.</p></div>
}

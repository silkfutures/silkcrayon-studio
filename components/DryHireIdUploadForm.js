"use client";
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';

function storageClient(){return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
const MAX=8*1024*1024;
const ALLOWED=['image/jpeg','image/png','image/webp','image/heic','image/heif'];

export default function DryHireIdUploadForm({token}){
 const [documentType,setDocumentType]=useState('driving_licence');
 const [ageConfirmed,setAgeConfirmed]=useState(false);
 const [file,setFile]=useState(null);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [done,setDone]=useState(false);
 async function submit(e){
  e.preventDefault();setMsg('');
  if(!ageConfirmed)return setMsg('Please confirm that the lead hirer is 18 or over.');
  if(!file)return setMsg('Choose a clear photo of your ID.');
  if(file.size>MAX)return setMsg('That file is larger than 8 MB. Please use a smaller photo.');
  if(!ALLOWED.includes(file.type))return setMsg('Use a JPG, PNG, WebP or HEIC photo.');
  setBusy(true);
  try{
   setMsg('Preparing secure upload…');
   const prep=await fetch(`/api/dry-hire-id/${encodeURIComponent(token)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'prepare_upload',documentType,ageConfirmed:true,fileName:file.name,mimeType:file.type,sizeBytes:file.size})});
   const pj=await prep.json().catch(()=>({}));if(!prep.ok)throw new Error(pj.error||'Could not prepare the ID upload.');
   setMsg('Uploading securely…');
   const {error:uploadError}=await storageClient().storage.from(pj.bucket).uploadToSignedUrl(pj.path,pj.uploadToken,file,{contentType:file.type});
   if(uploadError)throw uploadError;
   setMsg('Confirming upload…');
   const confirm=await fetch(`/api/dry-hire-id/${encodeURIComponent(token)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'submit_upload'})});
   const cj=await confirm.json().catch(()=>({}));if(!confirm.ok)throw new Error(cj.error||'The upload could not be confirmed.');
   setDone(true);setMsg('ID submitted securely ✓');
  }catch(err){setMsg(err?.message||'Could not upload ID. Please try again.')}finally{setBusy(false)}
 }
 if(done)return <div className="idCheckComplete"><span>✓</span><h2>ID received.</h2><p>Silkcrayon will review it before your dry hire. The photo will be deleted as soon as it is verified.</p></div>;
 return <form className="dryHireIdForm" onSubmit={submit}>
   <label className="field"><span>ID type</span><select value={documentType} onChange={e=>setDocumentType(e.target.value)}><option value="driving_licence">Driving licence</option><option value="passport">Passport</option></select></label>
   <label className="deliveryFile"><span>Photo of ID</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>Clear photo only · maximum 8 MB. The whole document should be visible and readable.</small></label>
   <label className="check policyCheck"><input type="checkbox" checked={ageConfirmed} onChange={e=>setAgeConfirmed(e.target.checked)}/><span><b>I confirm I am the lead hirer and I am 18 or over.</b><br/>This ID is mine and I am submitting it only for Silkcrayon Dry Hire verification.</span></label>
   <div className="idPrivacyNote"><b>Private by design.</b><p>Your photo is stored in a private bucket, is only accessible to Silkcrayon owners through a short-lived secure link, and is deleted immediately after verification or automatically within 7 days of submission.</p></div>
   <button className="button primary" disabled={busy}>{busy?'Working…':'Submit ID securely →'}</button>
   {msg&&<p className="deliveryMessage" aria-live="polite">{msg}</p>}
 </form>;
}

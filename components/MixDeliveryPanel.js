'use client';

import {useMemo,useRef,useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import styles from './MixDeliveryPanel.module.css';

function browserClient(){
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function fileKey(file){return `${file.name}:${file.size}:${file.lastModified}`}
function formatBytes(bytes){
  const n=Number(bytes||0);
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/(1024*1024)).toFixed(n>=100*1024*1024?0:1)} MB`;
}

export default function MixDeliveryPanel({jobId,revisions=[]}){
  const [mode,setMode]=useState('upload');
  const [url,setUrl]=useState('');
  const [files,setFiles]=useState([]);
  const [revisionId,setRevisionId]=useState('');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const inputRef=useRef(null);
  const totalSize=useMemo(()=>files.reduce((sum,file)=>sum+Number(file.size||0),0),[files]);

  function addFiles(event){
    const incoming=Array.from(event.target.files||[]);
    setFiles(current=>{
      const seen=new Set(current.map(fileKey));
      return [...current,...incoming.filter(file=>!seen.has(fileKey(file)))].slice(0,50);
    });
    event.target.value='';
    setMsg('');
  }

  function removeFile(index){setFiles(current=>current.filter((_,i)=>i!==index));setMsg('')}

  async function prepareAndUpload(file,index,total,client){
    let lastError=null;
    for(let attempt=1;attempt<=2;attempt++){
      try{
        setMsg(`${attempt===2?'Retrying':'Uploading'} ${index+1} of ${total} · ${file.name}`);
        const prep=await fetch(`/api/admin/mixes/${jobId}/delivery`,{
          method:'POST',headers:{'content-type':'application/json'},
          body:JSON.stringify({action:'prepare_upload',fileName:file.name,contentType:file.type||'application/octet-stream'})
        });
        const prepared=await prep.json().catch(()=>({}));
        if(!prep.ok)throw new Error(prepared.error||`Could not prepare ${file.name}.`);
        const {error}=await client.storage.from(prepared.bucket).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:file.type||'application/octet-stream'});
        if(error)throw new Error(error.message||`Could not upload ${file.name}.`);
        return {storagePath:prepared.path,fileName:file.name};
      }catch(error){
        lastError=error;
        if(attempt===1)await new Promise(resolve=>setTimeout(resolve,600));
      }
    }
    throw lastError||new Error(`Could not upload ${file.name}.`);
  }

  async function send(){
    try{
      setBusy(true);setMsg('');
      let payload={revisionId:revisionId||null};
      if(mode==='upload'){
        if(!files.length)throw new Error('Choose at least one mix file first.');
        const client=browserClient(),uploaded=[];
        for(let i=0;i<files.length;i++)uploaded.push(await prepareAndUpload(files[i],i,files.length,client));
        payload=uploaded.length===1
          ? {...payload,action:'deliver_upload',...uploaded[0]}
          : {...payload,action:'deliver_uploads',files:uploaded};
      }else{
        if(!url.trim())throw new Error('Paste the delivery link first.');
        payload={...payload,action:'deliver_link',externalUrl:url.trim()};
      }
      setMsg('Creating the review link and notifying the customer…');
      const response=await fetch(`/api/admin/mixes/${jobId}/delivery`,{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Could not send the mix.');
      setMsg(`${result.fileCount>1?`${result.fileCount} files`:'Mix'} sent ✓${result.emailSent?' Email sent.':''}${result.smsSent?' Text sent.':''}`);
      setUrl('');setFiles([]);
    }catch(error){
      const detail=error?.message||'Could not send the mix.';
      setMsg(detail==='Failed to fetch'?'Upload connection failed. Please retry. If it keeps happening, try a smaller batch or paste a Drive/Dropbox link.':detail);
    }finally{setBusy(false)}
  }

  return <div className={styles.panel}>
    <div className={styles.header}>
      <div><span className={styles.kicker}>CUSTOMER REVIEW DELIVERY</span><h3>Send a review-ready mix</h3><p>The customer gets one clean review page with downloads, a prominent <b>Approve mix</b> action and revision requests tucked away as a secondary option.</p></div>
      {files.length>0&&mode==='upload'?<div className={styles.count}><b>{files.length}</b><span>file{files.length===1?'':'s'}</span></div>:null}
    </div>

    <div className={styles.modeSwitch}>
      <button type="button" className={mode==='upload'?styles.active:''} onClick={()=>{setMode('upload');setMsg('')}}>Upload files</button>
      <button type="button" className={mode==='link'?styles.active:''} onClick={()=>{setMode('link');setMsg('')}}>Paste link</button>
    </div>

    <label className={styles.field}>
      <span>Version</span>
      <select value={revisionId} onChange={event=>setRevisionId(event.target.value)}>
        <option value="">First / final delivery</option>
        {revisions.map(revision=><option key={revision.id} value={revision.id}>Revision {revision.revision_number}</option>)}
      </select>
    </label>

    {mode==='upload'?<div className={styles.uploader}>
      <input ref={inputRef} className={styles.fileInput} type="file" multiple onChange={addFiles}/>
      <button type="button" className={styles.chooseButton} onClick={()=>inputRef.current?.click()} disabled={busy}>
        <span className={styles.plus}>＋</span><span><b>{files.length?'Add more files':'Choose mix files'}</b><small>Select WAV, MP3, stems or any other delivery files.</small></span>
      </button>
      {files.length?<div className={styles.fileList}>
        <div className={styles.fileListHead}><span>{files.length} selected</span><small>{formatBytes(totalSize)} total</small></div>
        {files.map((file,index)=><div className={styles.fileRow} key={fileKey(file)}><div><b>{file.name}</b><small>{formatBytes(file.size)}</small></div><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>removeFile(index)} disabled={busy}>×</button></div>)}
      </div>:<div className={styles.empty}>You can select several files at once. They will be delivered behind one customer link.</div>}
    </div>:<label className={styles.field}><span>Files link</span><input type="url" value={url} onChange={event=>setUrl(event.target.value)} placeholder="Google Drive, Dropbox, WeTransfer…"/></label>}

    <button type="button" className={styles.sendButton} disabled={busy} onClick={send}>{busy?'Sending…':'Send for customer review'}<span>→</span></button>
    {msg&&<p className={styles.message}>{msg}</p>}
    <p className={styles.note}>One email and one text are sent, even when you upload multiple files. Uploaded files stay available for 30 days.</p>
  </div>;
}

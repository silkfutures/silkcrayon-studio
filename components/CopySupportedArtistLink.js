'use client';
import {useRef,useState} from 'react';
export default function CopySupportedArtistLink(){
 const [message,setMessage]=useState(''),[fallback,setFallback]=useState('');const input=useRef(null);
 async function copy(){const link=new URL('/supported-artists',window.location.origin).href;try{await navigator.clipboard.writeText(link);setFallback('');setMessage('Application link copied.');}catch{setFallback(link);setMessage('Copy the link below.');requestAnimationFrame(()=>{input.current?.focus();input.current?.select();});}}
 return <div style={{margin:'24px 0',padding:20,border:'1px solid var(--line)'}}><p>Invite artists privately. The application is unlisted; you approve who receives a supported rate.</p><div className="actions" style={{flexWrap:'wrap'}}><button type="button" className="button primary" onClick={copy}>Copy application link</button><a className="textLink" href="/supported-artists" target="_blank" rel="noreferrer">Preview application ↗</a></div>{fallback&&<label className="field" style={{marginTop:16}}><span>Application link</span><input ref={input} readOnly value={fallback} onFocus={e=>e.target.select()}/></label>}<p role="status">{message}</p></div>;
}

'use client';
import {useEffect,useState,useRef} from 'react';
export default function FormProtection(){
 const ref=useRef(null);
 const [token,setToken]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;async function refresh(){try{const r=await fetch('/api/form-token',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error();if(active){setToken(j.token);setError(false)}}catch{if(active)setError(true)}}refresh();const timer=setInterval(refresh,60*60*1000);return()=>{active=false;clearInterval(timer)}},[retry]);
 useEffect(()=>{const form=ref.current?.form;const renew=()=>setTimeout(()=>setRetry(x=>x+1),1500);form?.addEventListener('submit',renew);return()=>form?.removeEventListener('submit',renew)},[]);
 return <><div style={{position:'absolute',left:'-10000px',width:1,height:1,overflow:'hidden'}} aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div><input ref={ref} type="hidden" name="form_token" value={token}/>{error&&<p role="alert">Could not verify this form. <button type="button" onClick={()=>setRetry(x=>x+1)}>Retry verification</button></p>}<noscript>Please enable JavaScript to submit this form.</noscript></>;
}

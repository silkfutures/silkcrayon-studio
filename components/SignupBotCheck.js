'use client';
import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
export default function SignupBotCheck({onToken}){
 const target=useRef(null),widget=useRef(null),callback=useRef(onToken),[ready,setReady]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 callback.current=onToken;
 const sitekey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 useEffect(()=>{if(!sitekey||!ready||!window.turnstile||!target.current)return;
  widget.current=window.turnstile.render(target.current,{sitekey,action:'email_signup',theme:'dark',size:'flexible',callback:token=>{setError(false);callback.current(token)},'expired-callback':()=>callback.current(''),'error-callback':()=>{callback.current('');setError(true)}});
  return()=>{if(widget.current!==null){window.turnstile?.remove(widget.current);widget.current=null}};
 },[sitekey,ready,retry]);
 if(!sitekey)return <p role="status">Email signup is temporarily unavailable. Please try again later.</p>;
 return <div style={{width:'100%',minWidth:0}}><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError(true)}/><div ref={target}/>{error&&<p role="alert">Verification could not load. <button type="button" onClick={()=>{callback.current('');setError(false);if(window.turnstile){setReady(true);setRetry(n=>n+1)}else window.location.reload()}}>Retry verification</button></p>}</div>;
}

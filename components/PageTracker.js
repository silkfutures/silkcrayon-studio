'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
export default function PageTracker(){
 const path=usePathname(),last=useRef(null),memoryId=useRef(null);
 useEffect(()=>{
  if(!path||path.startsWith('/admin')||path.startsWith('/api')||path.startsWith('/account')||last.current===path+globalThis.location?.search)return;
  last.current=path+globalThis.location?.search;
  let id=memoryId.current;
  try{id=localStorage.getItem('sc_vid')||id;}catch{/* Storage can be blocked by the browser. */}
  if(!id)id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  memoryId.current=id;try{localStorage.setItem('sc_vid',id);}catch{}
  // Preserve campaign labels across homepage -> booking, without storing URL paths or PII.
  try{
   const params=new URLSearchParams(window.location.search);
   const fields=['utm_source','utm_medium','utm_campaign'];
   const campaign=Object.fromEntries(fields.map(k=>[k,String(params.get(k)||'').slice(0,120)]).filter(([,v])=>v));
   if(Object.keys(campaign).length)sessionStorage.setItem('sc_campaign',JSON.stringify(campaign));
  }catch{}
  // Only store paths and referrer origins, never sign-in tokens or query strings.
  let referrer='';try{referrer=document.referrer?new URL(document.referrer).origin:'';}catch{}
  fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path,referrer,visitorId:id,campaign:(()=>{try{return JSON.parse(sessionStorage.getItem('sc_campaign')||'{}')}catch{return {}}})()}),keepalive:true}).then(r=>{if(!r.ok)console.warn('Studio analytics could not record this visit:',r.status);}).catch(()=>{});
 },[path]);
 return null;
}

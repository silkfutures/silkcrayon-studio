'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
export default function PageTracker(){
 const path=usePathname(),last=useRef(null),memoryId=useRef(null);
 useEffect(()=>{
  if(!path||path.startsWith('/admin')||path.startsWith('/api')||path.startsWith('/account')||last.current===path)return;
  last.current=path;
  let id=memoryId.current;
  try{id=localStorage.getItem('sc_vid')||id;}catch{/* Storage can be blocked by the browser. */}
  if(!id)id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  memoryId.current=id;try{localStorage.setItem('sc_vid',id);}catch{}
  // Only store paths and referrer origins, never sign-in tokens or query strings.
  let referrer='';try{referrer=document.referrer?new URL(document.referrer).origin:'';}catch{}
  fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path,referrer,visitorId:id}),keepalive:true}).then(r=>{if(!r.ok)console.warn('Studio analytics could not record this visit:',r.status);}).catch(()=>{});
 },[path]);
 return null;
}

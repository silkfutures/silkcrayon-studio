"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function PageTracker(){const path=usePathname();useEffect(()=>{if(path?.startsWith('/admin'))return;let id=localStorage.getItem('sc_vid');if(!id){id=crypto.randomUUID();localStorage.setItem('sc_vid',id)}fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path,referrer:document.referrer,visitorId:id}),keepalive:true}).catch(()=>{})},[path]);return null}

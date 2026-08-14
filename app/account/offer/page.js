"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
export default function Offer(){
 const [msg,setMsg]=useState('Opening secure checkout…');
 useEffect(()=>{(async()=>{try{const r=await fetch('/api/customer/packages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hours:2})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not open checkout.');location.replace(j.url)}catch(e){setMsg(e.message)}})()},[]);
 return <main className="customerPortal"><section className="portalHero"><p className="eyebrow">My Studio offer</p><h1>{msg}</h1><p><Link href="/account">← Back to My Studio</Link></p></section></main>
}

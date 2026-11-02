'use client';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
export default function StudioContact(){
 const path=usePathname(),[open,setOpen]=useState(false);
 if(['/admin','/account','/login','/staff'].some(p=>path?.startsWith(p)))return null;
 return <aside className="studioContact" aria-label="Contact Silkcrayon"><button type="button" aria-expanded={open} aria-controls="studio-contact-options" onClick={()=>setOpen(!open)}><span className="studioContactPrompt">Questions? </span><b>Call or text</b> {open?'−':'+'}</button>{open&&<div id="studio-contact-options"><a href="tel:+447577725944">Call 07577 725944</a><a href="sms:+447577725944">Text the studio</a></div>}</aside>;
}

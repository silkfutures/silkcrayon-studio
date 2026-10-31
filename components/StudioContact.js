"use client";

import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import styles from './StudioContact.module.css';

const PHONE='+447577725944';
const PRIVATE_ROUTES=['/admin','/account','/api','/engineer-offer','/files','/dry-hire-id','/pay','/unsubscribe'];

export default function StudioContact(){
 const path=usePathname();
 const ref=useRef(null);
 const hidden=!path||PRIVATE_ROUTES.some(route=>path===route||path.startsWith(`${route}/`));

 useEffect(()=>{
  const element=ref.current;
  if(!element)return;
  element.open=false;
  let frame;
  // Measure the visible booking controls, including changes during checkout.
  function position(){
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    let bottom=16;
    document.querySelectorAll('.mobileBookBar,.checkoutBar').forEach(control=>{
     const rect=control.getBoundingClientRect();
     if(rect.width&&rect.height&&rect.top<window.innerHeight&&rect.bottom>0){
      bottom=Math.max(bottom,window.innerHeight-rect.top+12);
     }
    });
    element.style.setProperty('--contact-bottom',`${bottom}px`);
   });
  }
  function closeOutside(event){if(!element.contains(event.target))element.open=false;}
  function escape(event){if(event.key==='Escape'&&element.open){element.open=false;element.querySelector('summary')?.focus();}}
  const observer=new MutationObserver(position);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,{passive:true});
  document.addEventListener('pointerdown',closeOutside);
  document.addEventListener('keydown',escape);
  position();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',position);window.removeEventListener('scroll',position);document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',escape);};
 },[path,hidden]);

 if(hidden)return null;
 return <details ref={ref} className={styles.contact}>
  <summary aria-controls="studio-contact-options">Questions? <span>Call or text</span><span className={styles.plus} aria-hidden="true">+</span></summary>
  <div id="studio-contact-options" className={styles.panel}>
   <strong>Let’s talk about your session.</strong>
   <p>Need help choosing or booking? Get in touch.</p>
   <span className={styles.number}>07577 725944</span>
   <div className={styles.actions}>
    <a href={`tel:${PHONE}`} aria-label="Call Silkcrayon on 07577 725944">Call us</a>
    <a href={`sms:${PHONE}`} aria-label="Text Silkcrayon on 07577 725944">Text us</a>
   </div>
  </div>
 </details>;
}

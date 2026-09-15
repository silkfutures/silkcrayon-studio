"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

export default function SiteHeader(){
  const [open,setOpen]=useState(false);
  const toggleRef=useRef(null),menuRef=useRef(null),brandRef=useRef(null);
  const [scrolled,setScrolled]=useState(false);

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>28);
    fn();
    window.addEventListener('scroll',fn,{passive:true});
    return()=>window.removeEventListener('scroll',fn);
  },[]);

  useEffect(()=>{
    document.documentElement.classList.toggle('navLocked',open);
    document.body.classList.toggle('navLocked',open);
    return()=>{
      document.documentElement.classList.remove('navLocked');
      document.body.classList.remove('navLocked');
    };
  },[open]);

  useEffect(()=>{
    if(!open)return;
    // Keep page content out of keyboard traversal while the navigation dialog is open.
    const main=menuRef.current?.closest('main');
    const siblings=main?[...main.children].filter(el=>el.tagName!=='HEADER'):[];
    const previous=siblings.map(el=>[el,el.inert]);
    previous.forEach(([el])=>{el.inert=true});
    const oldBrand=brandRef.current?.getAttribute('tabindex');
    brandRef.current?.setAttribute('tabindex','-1');
    menuRef.current?.querySelector('a')?.focus();
    function keydown(event){
      if(event.key==='Escape'){event.preventDefault();setOpen(false);return}
      if(event.key!=='Tab')return;
      const nodes=[toggleRef.current,...menuRef.current.querySelectorAll('a,button')].filter(Boolean);
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);previous.forEach(([el,inert])=>{el.inert=inert});if(oldBrand===null)brandRef.current?.removeAttribute('tabindex');else if(oldBrand!==undefined)brandRef.current?.setAttribute('tabindex',oldBrand);toggleRef.current?.focus()};
  },[open]);
  const close=()=>setOpen(false);

  return <header className={`siteHeader ${scrolled?'isScrolled':''} ${open?'menuOpen':''}`}>
    <Link href="/" className="brand" ref={brandRef} onClick={close}><img src="/logo.png" alt="Silkcrayon"/></Link>

    <nav className="desktopNav">
      <Link href="/services">Services</Link>
      <a href="/#space">The Studio</a>
      <a href="/#work">Listen</a>
      <Link href="/contact">Visit &amp; Contact</Link>
      <Link href="/account/login">My Studio</Link>
      <Link className="navCta" href="/booking">BOOK</Link>
    </nav>

    <button ref={toggleRef} aria-controls={open?"site-navigation":undefined} className="menuButton" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span/><span/>
    </button>

    {open&&<div id="site-navigation" ref={menuRef} className="mobileMenu" role="dialog" aria-modal="true" aria-label="Site navigation">
      <Link href="/services" onClick={close}>Services</Link>
      <a href="/#space" onClick={close}>The Studio</a>
      <a href="/#work" onClick={close}>Listen</a>
      <Link href="/contact" onClick={close}>Visit &amp; Contact</Link>
      <Link href="/account/login" onClick={close}>My Studio</Link>
      <Link className="button primary" href="/booking" onClick={close}>Book a session</Link>
    </div>}
  </header>
}

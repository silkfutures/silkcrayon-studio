"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SiteHeader(){
  const [open,setOpen]=useState(false);
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

  const close=()=>setOpen(false);

  return <header className={`siteHeader ${scrolled?'isScrolled':''} ${open?'menuOpen':''}`}>
    <Link href="/" className="brand" onClick={close}><img src="/logo.png" alt="Silkcrayon"/></Link>

    <nav className="desktopNav">
      <a href="/#experience">Why Silkcrayon</a>
      <a href="/#services">Services</a>
      <a href="/#space">The Space</a>
      <a href="/#work">Listen</a>
      <Link href="/account/login">My Studio</Link>
      <Link className="navCta" href="/booking">BOOK</Link>
    </nav>

    <button className="menuButton" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span/><span/>
    </button>

    {open&&<div className="mobileMenu" role="dialog" aria-modal="true" aria-label="Site navigation">
      <a href="/#experience" onClick={close}>Why Silkcrayon</a>
      <a href="/#services" onClick={close}>Services</a>
      <a href="/#space" onClick={close}>The Space</a>
      <a href="/#work" onClick={close}>Listen</a>
      <Link href="/buy-hours" onClick={close}>Buy Hours</Link>
      <Link href="/gift-studio-time" onClick={close}>Gift Studio Time</Link>
      <Link href="/young-creators" onClick={close}>Young Creators</Link>
      <Link href="/account/login" onClick={close}>My Studio</Link>
      <a href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer" onClick={close}>Instagram ↗</a>
      <Link className="button primary" href="/booking" onClick={close}>Book a session</Link>
    </div>}
  </header>
}

"use client";
import { useEffect, useRef } from "react";
export default function Reveal({children,className="",delay=0}){
  const ref=useRef(null);
  useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){el.classList.add('inView');io.unobserve(el)}},{threshold:.12,rootMargin:'0px 0px -5%'});io.observe(el);return()=>io.disconnect()},[]);
  return <div ref={ref} className={`reveal ${className}`} style={{'--reveal-delay':`${delay}ms`}}>{children}</div>
}

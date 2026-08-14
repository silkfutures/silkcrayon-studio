"use client";
import {useEffect} from 'react';
export default function ScrollToTop(){useEffect(()=>{history.scrollRestoration='manual';requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));},[]);return null}

'use client';
import {useState} from 'react';
import MixJobForm from './MixJobForm';
export default function MixCreateDrawer({customers}){
 const [open,setOpen]=useState(false);
 return <section className="mixCreateShell" aria-label="Create a mix">
   <button className="mixCreateTrigger" type="button" aria-expanded={open} aria-controls="mix-create-panel" onClick={()=>setOpen(x=>!x)}>
    <span className="mixCreateIcon" aria-hidden="true">{open?'−':'+'}</span><span>{open?'Close new mix':'Create mix'}</span><span className="mixCreateChevron" aria-hidden="true">{open?'↑':'↓'}</span>
   </button>
   {open&&<div id="mix-create-panel" className="mixCreatePanel"><MixJobForm customers={customers}/></div>}
 </section>
}

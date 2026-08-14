"use client";
import {useMemo,useState} from 'react';
export default function ArtistSearchSelect({customers=[],value='',onChange}){
 const selected=customers.find(c=>c.id===value);const [q,setQ]=useState(selected?(selected.artist_name||selected.full_name||''):'');const [open,setOpen]=useState(false);
 const results=useMemo(()=>{const term=q.trim().toLowerCase();if(!term)return customers.slice(0,8);return customers.filter(c=>`${c.artist_name||''} ${c.full_name||''} ${c.email||''}`.toLowerCase().includes(term)).slice(0,10)},[q,customers]);
 function choose(c){onChange(c.id);setQ(c.artist_name||c.full_name||c.email);setOpen(false)}
 return <div className="artistSearch"><input value={q} placeholder="Type an artist name or email…" onFocus={()=>setOpen(true)} onChange={e=>{setQ(e.target.value);onChange('');setOpen(true)}} autoComplete="off"/>{selected&&<button type="button" className="artistClear" onClick={()=>{setQ('');onChange('');setOpen(true)}}>×</button>}{open&&<div className="artistResults">{results.length?results.map(c=><button type="button" key={c.id} onClick={()=>choose(c)}><span className="engAvatar mini">{(c.artist_name||c.full_name||'?').slice(0,1).toUpperCase()}</span><span><b>{c.artist_name||c.full_name}</b><small>{c.full_name&&c.artist_name?`${c.full_name} · `:''}{c.email}</small></span></button>):<div className="artistNoResult">No matching artist.</div>}</div>}</div>;
}

"use client";
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';

export default function ArtistBulkDeleteList({customers=[]}){
 const router=useRouter();
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const allSelected=customers.length>0&&selected.length===customers.length;
 const selectedSet=useMemo(()=>new Set(selected),[selected]);
 function toggle(id){setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}
 async function removeSelected(){
  if(!selected.length||busy)return;
  if(!window.confirm(`Delete ${selected.length} selected artist${selected.length===1?'':'s'}? Only test/empty artist records can be permanently deleted; real booking history is protected.`))return;
  setBusy(true);setMsg('Deleting…');let deleted=0;const protectedNames=[];
  for(const id of selected){
   const c=customers.find(x=>x.id===id);try{const r=await fetch(`/api/admin/customers/${id}`,{method:'DELETE'});const j=await r.json();if(r.ok)deleted++;else protectedNames.push(`${c?.artist_name||c?.full_name||'Artist'} — ${j.error||'protected'}`)}catch{protectedNames.push(`${c?.artist_name||c?.full_name||'Artist'} — could not delete`)}
  }
  setBusy(false);setSelected([]);setSelecting(false);
  setMsg(protectedNames.length?`${deleted} deleted. ${protectedNames.length} protected: ${protectedNames.slice(0,2).join(' · ')}${protectedNames.length>2?'…':''}`:`${deleted} artist${deleted===1?'':'s'} deleted ✓`);
  router.refresh();
 }
 return <>
  <div className="artistBulkToolbar"><button type="button" className="textLink buttonReset" onClick={()=>{setSelecting(v=>!v);setSelected([]);setMsg('')}}>{selecting?'Done':'Select'}</button>{selecting&&<><button type="button" className="textLink buttonReset" onClick={()=>setSelected(allSelected?[]:customers.map(c=>c.id))}>{allSelected?'Clear all':'Select all'}</button><button type="button" className="dangerMini" disabled={!selected.length||busy} onClick={removeSelected}>{busy?'Deleting…':`Delete selected${selected.length?` (${selected.length})`:''}`}</button></>}{msg&&<small className="artistBulkMsg">{msg}</small>}</div>
  <div className="engArtistList">{customers.map(c=>selecting?<label key={c.id} className={`engArtistRow selectable ${selectedSet.has(c.id)?'selected':''}`}><input type="checkbox" checked={selectedSet.has(c.id)} onChange={()=>toggle(c.id)}/><div className="engAvatar">{(c.artist_name||c.full_name||'?').slice(0,1).toUpperCase()}</div><div><b>{c.artist_name||c.full_name}</b><small>{c.full_name}{c.preferred_genre?' · '+c.preferred_genre:''}</small></div></label>:<Link key={c.id} href={`/admin/artists/${c.id}`} className="engArtistRow"><div className="engAvatar">{(c.artist_name||c.full_name||'?').slice(0,1).toUpperCase()}</div><div><b>{c.artist_name||c.full_name}</b><small>{c.full_name}{c.preferred_genre?' · '+c.preferred_genre:''}</small></div><span>→</span></Link>)}{!customers.length&&<div className="engEmpty"><b>No artists found.</b><p>Try another search or register a new artist.</p></div>}</div>
 </>
}

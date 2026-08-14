"use client";
import {useState} from 'react';
export default function EmailSignup(){
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[state,setState]=useState('');
 async function submit(e){e.preventDefault();setState('Joining…');const r=await fetch('/api/marketing/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,name})});const j=await r.json().catch(()=>({}));setState(r.ok?'You’re in. Your 5% next-session reward is saved ✓':j.error||'Could not sign you up.')}
 return <form className="emailSignup" onSubmit={submit}><div><p className="eyebrow">Stay close to the studio</p><h3>Join the list. Get 5% off your next session.</h3><p>Occasional studio news, opportunities and offers. No spam.</p></div><div className="emailSignupFields"><input value={name} onChange={e=>setName(e.target.value)} placeholder="First name" maxLength="80"/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" maxLength="254"/><button className="button outline">Join + save 5% →</button></div>{state&&<small>{state}</small>}</form>
}

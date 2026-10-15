"use client";
import SignupBotCheck from './SignupBotCheck';
import FormProtection from './FormProtection';

import {useState} from 'react';
export default function EmailSignup(){
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[state,setState]=useState('');
 const [botToken,setBotToken]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[attempt,setAttempt]=useState(0);
 async function submit(e){
  e.preventDefault();if(busy||done||!botToken)return;setBusy(true);setState('Joining…');
  const body={...Object.fromEntries(new FormData(e.currentTarget)),email,name,turnstileToken:botToken};
  try{const r=await fetch('/api/marketing/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Could not sign you up.');setDone(true);setState(j.message||'You’re in. Your 5% next-session reward is saved ✓');}
  catch(error){setState(error.message||'Could not sign you up. Please try again.');}
  finally{setBusy(false);setBotToken('');setAttempt(n=>n+1);}
 }
 return <form className="emailSignup" onSubmit={submit}><FormProtection key={attempt}/><div><p className="eyebrow">Stay close to the studio</p><h3>Join the list. Get 5% off your next session.</h3><p>Occasional studio news, opportunities and offers. No spam.</p></div><div className="emailSignupFields"><input value={name} onChange={e=>setName(e.target.value)} placeholder="First name" maxLength="80"/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" maxLength="254"/><button className="button outline" disabled={busy||done||!botToken}>{busy?'Joining…':done?'Joined ✓':'Join + save 5% →'}</button></div>{!done&&<SignupBotCheck key={attempt} onToken={setBotToken}/>} {state&&<small role="status">{state}</small>}</form>
}

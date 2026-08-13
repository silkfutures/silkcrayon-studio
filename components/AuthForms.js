"use client";
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

function browserClient(){
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function LoginForm(){
  const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter(); const params=useSearchParams();
  async function submit(e){e.preventDefault();setBusy(true);setMsg('');const fd=new FormData(e.currentTarget);const {error}=await browserClient().auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error){setMsg(error.message);setBusy(false);return;}router.push(params.get('next')||'/admin');router.refresh();}
  return <form className="authForm" onSubmit={submit}><label><span>Email</span><input type="email" name="email" autoComplete="email" required/></label><label><span>Password</span><input type="password" name="password" autoComplete="current-password" required/></label><button className="button primary" disabled={busy}>{busy?'Signing in…':'Log in →'}</button>{msg&&<p className="authError">{msg}</p>}</form>
}

export function SetupForm(){
  const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e){e.preventDefault();setBusy(true);setMsg('Creating owner account…');const body=Object.fromEntries(new FormData(e.currentTarget).entries());const r=await fetch('/api/auth/bootstrap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok){setMsg(j.error||'Could not create owner account.');setBusy(false);return;}setMsg('Owner account created. Redirecting to login…');setTimeout(()=>router.push('/admin/login'),700);}
  return <form className="authForm" onSubmit={submit}><div className="authDivider">Existing temporary admin credentials</div><label><span>Legacy username</span><input name="legacyUsername" required defaultValue="silkcrayon"/></label><label><span>Legacy admin password</span><input type="password" name="legacyPassword" required/></label><div className="authDivider">Your new owner account</div><label><span>Your name</span><input name="fullName" required placeholder="Nathan Misra"/></label><label><span>Email</span><input type="email" name="email" required/></label><label><span>New password</span><input type="password" name="newPassword" minLength="10" required/></label><button className="button primary" disabled={busy}>{busy?'Creating…':'Create owner account →'}</button>{msg&&<p className="muted">{msg}</p>}</form>
}

export function LogoutButton(){const router=useRouter();async function out(){await browserClient().auth.signOut();router.push('/admin/login');router.refresh();}return <button className="navLogout" onClick={out}>Log out</button>}

export function StaffCreateForm(){
 const [msg,setMsg]=useState(''); const router=useRouter();
 async function submit(e){e.preventDefault();setMsg('Creating…');const body=Object.fromEntries(new FormData(e.currentTarget).entries());const r=await fetch('/api/admin/staff',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok){setMsg(j.error||'Could not create staff account.');return;}e.currentTarget.reset();setMsg('Staff account created.');router.refresh();}
 return <form className="staffForm" onSubmit={submit}><label className="field"><span>Name</span><input name="fullName" required/></label><label className="field"><span>Engineer display name</span><input name="engineerName" placeholder="e.g. Isaak"/></label><label className="field"><span>Email</span><input type="email" name="email" required/></label><label className="field"><span>Temporary password</span><input type="password" name="password" minLength="10" required/></label><label className="field"><span>Role</span><select name="role" defaultValue="engineer"><option value="engineer">Engineer</option><option value="owner">Owner</option></select></label><button className="button primary">Create account</button>{msg&&<small className="muted">{msg}</small>}</form>
}

export function StaffActiveToggle({id,active}){const router=useRouter();const [busy,setBusy]=useState(false);async function toggle(){setBusy(true);await fetch(`/api/admin/staff/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({active:!active})});router.refresh();setBusy(false);}return <button className="miniButton" disabled={busy} onClick={toggle}>{active?'Deactivate':'Reactivate'}</button>}

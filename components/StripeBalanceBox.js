'use client';
import {useEffect,useState} from 'react';
import s from './EngineerWork.module.css';
const money=p=>p==null?'—':`£${(Number(p)/100).toFixed(2)}`;
export default function StripeBalanceBox(){
 const [b,setB]=useState(null),[err,setErr]=useState(false);
 useEffect(()=>{let live=true;fetch('/api/admin/engineer-pay/balance').then(r=>r.ok?r.json():Promise.reject()).then(j=>{if(live)setB(j);}).catch(()=>{if(live)setErr(true);});return ()=>{live=false;};},[]);
 return <div className={s.feeBox} style={{marginBottom:12}} aria-busy={!b&&!err}>
  <div><small>Stripe balance · available now</small><b data-sensitive="financial">{err?'Unavailable':b?(b.available==null?'Unavailable':money(b.available)):'Loading…'}</b>{b?.pending?<small data-sensitive="financial">+ {money(b.pending)} on its way from card payments</small>:null}</div>
  <div style={{textAlign:'right'}}><small>Approved to send from balance</small><b data-sensitive="financial">{b?money(b.needed):'…'}</b>{b?.short?<small style={{color:'#ff8f8f'}} data-sensitive="financial">{money(b.short)} short — top up or mark as paid outside Stripe</small>:null}</div>
 </div>;
}

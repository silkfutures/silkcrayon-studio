"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';

export default function PromotionBanner(){
 const [promo,setPromo]=useState(null);
 useEffect(()=>{fetch('/api/public/promotions').then(r=>r.json()).then(j=>setPromo(j.promotions?.[0]||null)).catch(()=>{})},[]);
 if(!promo)return null;
 const price=promo.amountPence?`£${(promo.amountPence/100).toFixed(promo.amountPence%100?2:0)}`:'';
 const list=promo.listAmountPence?`£${(promo.listAmountPence/100).toFixed(promo.listAmountPence%100?2:0)}`:'';
 return <section className="livePromoBanner"><div className="container livePromoInner">
   <div className="saleBurst"><span>{promo.badgeText||'OFFER'}</span></div>
   <div className="livePromoCopy"><small>LIVE STUDIO OFFER</small><h2>{promo.bannerTitle||promo.name}</h2><p>{promo.bannerCopy}</p>{price&&<div className="promoPrice"><b>{price}</b>{list&&list!==price&&<s>{list}</s>}</div>}</div>
   <Link className="button primary" href={promo.ctaHref||'/booking'}>{promo.ctaLabel||'Book now'} →</Link>
 </div></section>
}

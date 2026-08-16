import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import AdminNav from '../../../components/AdminNav';
import {PromotionToggle,PromotionEdit} from '../../../components/PromotionAdmin';
export const dynamic='force-dynamic';
export default async function Promotions(){
 const ctx=await requireOwner(),{data:promotions=[]}=await getAdminDb().from('site_promotions').select('*').order('priority',{ascending:false});
 return <main className="adminPage promotionsAdmin"><header className="adminHeader"><div><p className="eyebrow">Website</p><h1>Promotions.</h1><p className="muted">Turn offers on and off without redeploying the site.</p></div><AdminNav profile={ctx.profile}/></header>
 <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Live controls</p><h2>Studio offers</h2></div><p className="muted">Active offers automatically appear on the homepage and against the matching booking duration.</p></div>
 <div className="promotionAdminGrid">{promotions.map(p=><article className={`promotionAdminCard ${p.active?'live':''}`} key={p.id}><div className="promotionAdminHead"><div className="saleBurst adminBurst"><span>{p.badge_text||'OFFER'}</span></div><div><small>{p.slug}</small><h3>{p.name}</h3><p>{p.service_slug} · {p.duration_minutes/60}h · £{(p.amount_pence/100).toFixed(2)}</p></div><PromotionToggle id={p.id} active={p.active}/></div><PromotionEdit promotion={p}/></article>)}</div>
 </section></main>
}

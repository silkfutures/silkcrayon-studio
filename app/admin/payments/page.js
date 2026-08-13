import AdminNav from '../../../components/AdminNav';
import {EngineerHeader,EngineerBottomNav} from '../../../components/EngineerShell';
import PaymentCreateForm from '../../../components/PaymentCreateForm';
import {requireStaff} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {formatGBP} from '../../../lib/services';
export const dynamic='force-dynamic';
export default async function Payments({searchParams}){
 const ctx=await requireStaff(); const sp=await searchParams; const db=getAdminDb(); const eng=ctx.profile.role==='engineer';
 const [{data:customers=[]},{data:payments=[]}]=await Promise.all([db.from('customers').select('id,full_name,artist_name,email').order('artist_name').limit(500),db.from('studio_payments').select('*,customers(full_name,artist_name)').order('created_at',{ascending:false}).limit(20)]);
 return <main className={eng?'engApp':'engineerApp'}>{eng?<EngineerHeader profile={ctx.profile} eyebrow="Payments"/>:<header className="mobileTop"><div><p className="eyebrow">Payments</p><h1>Get paid.</h1></div><AdminNav profile={ctx.profile}/></header>}
   <section className="engWelcome compact"><p className="eyebrow">Checkout</p><h1>Take payment.</h1><p>Choose the artist, amount or studio-hours package. Stripe handles checkout securely.</p></section>
   {sp?.paid==='1'&&<div className="successBanner">✓ Payment complete. The artist account will update automatically.</div>}
   <section className="engSection"><PaymentCreateForm customers={customers} defaultCustomerId={sp?.customer||''} defaultAmount={sp?.amount||''} defaultDescription={sp?.description||''} defaultPackage={sp?.package||''}/></section>
   <section className="engSection"><div className="engSectionHead"><div><h2>Recent payments</h2><p>Latest studio charges.</p></div></div><div className="engArtistList">{payments.slice(0,8).map(p=><div key={p.id} className="engArtistRow paymentRow"><div className="engAvatar">£</div><div><b>{p.customers?.artist_name||p.customers?.full_name||'Customer'}</b><small>{p.description} · {p.status}</small></div><span>{formatGBP(p.amount_pence)}</span></div>)}</div></section>
   {eng&&<EngineerBottomNav/>}</main>
}

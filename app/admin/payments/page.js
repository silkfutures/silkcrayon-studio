import AdminNav from '../../../components/AdminNav';
import {EngineerHeader,EngineerBottomNav} from '../../../components/EngineerShell';
import PaymentCreateForm from '../../../components/PaymentCreateForm';
import AppBackButton from '../../../components/AppBackButton';
import RecentPaymentsManager from '../../../components/RecentPaymentsManager';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {getStudioSettings} from '../../../lib/studioSettings';
export const dynamic='force-dynamic';
export default async function Payments({searchParams}){
 const ctx=await requireOwner(); const sp=await searchParams; const db=getAdminDb(); const eng=ctx.profile.role==='engineer'; const settings=await getStudioSettings();
 const [{data:customers=[]},{data:payments=[]},{data:bookings=[]}]=await Promise.all([db.from('customers').select('id,full_name,artist_name,email').order('artist_name').limit(500),db.from('studio_payments').select('*,customers(full_name,artist_name)').order('created_at',{ascending:false}).limit(80),db.from('bookings').select('id,customer_id,booking_date,start_time,service_name,status,payment_status,amount_pence,amount_paid_pence').neq('status','cancelled').order('booking_date',{ascending:false}).limit(500)]);
 return <main className={eng?'engApp':'engineerApp'}>{eng?<EngineerHeader profile={ctx.profile} eyebrow="Payments"/>:<header className="mobileTop"><div><p className="eyebrow">Payments</p><h1>Get paid.</h1></div><AdminNav profile={ctx.profile}/></header>}
   <div className="appBackRow"><AppBackButton fallback="/admin/engineer"/></div><section className="engWelcome compact"><p className="eyebrow">Checkout</p><h1>Take payment.</h1><p>Search the artist, choose what they’re buying, then apply the right package or approved discount.</p></section>
   {sp?.paid==='1'&&<div className="successBanner">✓ Payment complete. The artist account will update automatically.</div>}
   <section className="engSection"><PaymentCreateForm customers={customers} bookings={bookings} defaultBookingId={sp?.booking||''} defaultCustomerId={sp?.customer||''} defaultAmount={sp?.amount||''} defaultDescription={sp?.description||''} defaultPackage={sp?.hours||sp?.package||''} defaultKind={sp?.kind||''} studioFinishPrice={settings.studioFinishPricePence/100} hourlyPrice={settings.studioHourlyPricePence/100} relaunchPrice={settings.relaunchOfferPricePence/100} studioFinishTurnaround={settings.studioFinishTurnaround} studioFinishRevisions={settings.studioFinishRevisions}/></section>
   <RecentPaymentsManager payments={payments} bookings={bookings}/>
   {eng&&<EngineerBottomNav profile={ctx.profile}/>}</main>
}

import AdminNav from '../../../../components/AdminNav';
import AppBackButton from '../../../../components/AppBackButton';
import ManualBookingForm from '../../../../components/ManualBookingForm';
import {requireOwner} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function NewBooking(){
 const ctx=await requireOwner(),db=getAdminDb();
 const [customerResult,engineerResult]=await Promise.all([
  db.from('customers').select('id,full_name,artist_name,email,phone').order('artist_name').limit(1000),
  db.from('staff_profiles').select('user_id,full_name,engineer_name,role,active,email').in('role',['owner','engineer']).eq('active',true).order('full_name')
 ]);
 const customers=Array.isArray(customerResult.data)?customerResult.data:[];
 const engineers=Array.isArray(engineerResult.data)?engineerResult.data:[];
 return <main className="engineerApp"><header className="mobileTop"><div><p className="eyebrow">Bookings</p><h1>Add a session.</h1></div><AdminNav profile={ctx.profile}/></header><div className="appBackRow"><AppBackButton fallback="/admin"/></div><section className="engWelcome compact"><p className="eyebrow">DM / phone booking</p><h1>Book it for them.</h1><p>Create the calendar booking, send their confirmation by email/text, and optionally send a bank-payment link in one go.</p></section><section className="engSection"><ManualBookingForm customers={customers} engineers={engineers}/></section></main>
}
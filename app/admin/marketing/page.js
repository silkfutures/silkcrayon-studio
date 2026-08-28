import AdminNav from '../../../components/AdminNav';
import MarketingCentre from '../../../components/MarketingCentre';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';

function looksLikePreviousCustomer(c,booked){
 if(c.customer_id&&booked.has(c.customer_id))return true;
 const text=[c.source,c.last_activity,...(c.labels||[])].filter(Boolean).join(' ').toLowerCase();
 return /booking|booked|studio|hour|recording|session|canton|cardiff bay/.test(text);
}
export default async function Marketing(){
 const ctx=await requireOwner(),db=getAdminDb();
 const [{data:contacts=[]},{data:campaigns=[]},{data:bookings=[]}]=await Promise.all([
  db.from('crm_contacts').select('id,customer_id,first_name,last_name,full_name,email,phone,source,labels,last_activity,marketing_status,marketing_consent').not('email','is',null).order('full_name'),
  db.from('marketing_campaigns').select('*').order('created_at',{ascending:false}).limit(30),
  db.from('bookings').select('customer_id').not('customer_id','is',null)
 ]);
 const booked=new Set(bookings.map(x=>x.customer_id).filter(Boolean));
 const audienceContacts=contacts.map(c=>({...c,is_previous_customer:looksLikePreviousCustomer(c,booked)}));
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Growth</p><h1>Marketing.</h1><p className="muted">Choose your audience, build the campaign, test it, then send.</p></div><AdminNav profile={ctx.profile}/></header><MarketingCentre contacts={audienceContacts} campaigns={campaigns}/></main>
}

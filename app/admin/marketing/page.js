import AdminNav from '../../../components/AdminNav';
import MarketingCentre from '../../../components/MarketingCentre';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';

export default async function Marketing(){
 const ctx=await requireOwner(),db=getAdminDb();
 const [{data:contacts=[]},{data:campaigns=[]},{data:bookings=[]}]=await Promise.all([
  db.from('crm_contacts').select('id,customer_id,email,marketing_status,marketing_consent,source,labels'),
  db.from('marketing_campaigns').select('*').order('created_at',{ascending:false}).limit(30),
  db.from('bookings').select('customer_id').not('customer_id','is',null)
 ]);
 const bookedIds=new Set(bookings.map(x=>x.customer_id).filter(Boolean));
 const withEmail=contacts.filter(c=>c.email);
 const subscribed=withEmail.filter(c=>c.marketing_status==='subscribed'&&c.marketing_consent===true);
 const previousCustomers=withEmail.filter(c=>c.customer_id&&bookedIds.has(c.customer_id));
 const previousSubscribed=previousCustomers.filter(c=>c.marketing_status==='subscribed'&&c.marketing_consent===true);
 const notAsked=withEmail.filter(c=>!c.marketing_consent&&!['unsubscribed','never_subscribed'].includes(c.marketing_status));
 const unsubscribed=withEmail.filter(c=>c.marketing_status==='unsubscribed'||c.marketing_status==='never_subscribed');
 const audience={
  total:withEmail.length,
  subscribed:subscribed.length,
  previousCustomers:previousCustomers.length,
  previousSubscribed:previousSubscribed.length,
  notAsked:notAsked.length,
  unsubscribed:unsubscribed.length
 };
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Growth</p><h1>Marketing.</h1><p className="muted">Choose exactly who this campaign is for, then write, test and send.</p></div><AdminNav profile={ctx.profile}/></header><MarketingCentre audience={audience} campaigns={campaigns}/></main>
}

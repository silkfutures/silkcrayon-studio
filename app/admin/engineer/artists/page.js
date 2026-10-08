import Link from 'next/link';
import {requireStaff} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {EngineerHeader,EngineerBottomNav} from '../../../../components/EngineerShell';
import EngineerArtistCreate from '../../../../components/EngineerArtistCreate';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function EngineerArtists(){
 const ctx=await requireStaff();
 if(ctx.profile.role!=='engineer')return <main className="engApp"><p>Use the <Link href="/admin/artists">owner artist database</Link>.</p></main>;
 const db=getAdminDb();
 const [{data:introduced=[],error:e1},{data:bookings=[],error:e2}]=await Promise.all([
  db.from('customers').select('id,full_name,artist_name,email,phone,created_at').eq('registered_by_user_id',ctx.user.id).order('created_at',{ascending:false}).limit(300),
  db.from('bookings').select('customer_id,customers(id,full_name,artist_name,email,phone)').eq('engineer_user_id',ctx.user.id).order('created_at',{ascending:false}).limit(500)
 ]);
 if(e1||e2)throw new Error('Unable to load assigned artists.');
 const entries=new Map();
 for(const c of introduced)entries.set(c.id,{...c,origin:'Introduced'});
 for(const booking of bookings){
  const c=booking.customers;
  if(c?.id&&!entries.has(c.id))entries.set(c.id,{...c,origin:'Assigned'});
 }
 const artists=[...entries.values()].sort((a,b)=>(a.artist_name||a.full_name).localeCompare(b.artist_name||b.full_name));
 return <main className="engApp">
  <EngineerHeader profile={ctx.profile} eyebrow="My Artists"/>
  <section className="engWelcome"><p className="eyebrow">Your artist relationships</p><h1>My Artists</h1><p>Only customers you introduced or were assigned to work with.</p></section>
  <EngineerArtistCreate/>
  <section className="engSection"><div className="engSectionHead"><h2>My customers</h2><span className="engCount">{artists.length}</span></div>
   <div className="engSessionStack">{artists.length?artists.map(a=><article className="engSessionCard" key={a.id}>
    <div className="engSessionMain"><h3>{a.artist_name||a.full_name}</h3><p>{a.full_name} · {a.origin}</p>
     <div className="recentCompletedActions"><a href={`mailto:${a.email}`}>Email</a>{a.phone&&<a href={`tel:${a.phone}`}>Call</a>}</div>
    </div>
   </article>):<div className="engEmpty"><b>No artists yet.</b><p>Add your regular artists here, or they will appear once sessions are assigned to you.</p></div>}</div>
  </section>
  <section className="engSection"><Link href="/admin/engineer/book" className="engQuick primary">＋ Book a recording →</Link></section>
  <EngineerBottomNav profile={ctx.profile}/>
 </main>;
}
import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';
import {EngineerHeader,EngineerBottomNav} from '../../../components/EngineerShell';
import CustomerCreateForm from '../../../components/CustomerCreateForm';
import {requireStaff} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';
export default async function Artists({searchParams}){
 const ctx=await requireStaff(); const sp=await searchParams; const showNew=sp?.new==='1'; const q=(sp?.q||'').trim();
 let query=getAdminDb().from('customers').select('id,full_name,artist_name,email,phone,postcode,preferred_genre,created_at').order('created_at',{ascending:false}).limit(250);
 if(q) query=query.or(`artist_name.ilike.%${q}%,full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
 const {data:customers=[]}=await query; const eng=ctx.profile.role==='engineer';
 return <main className={eng?'engApp':'engineerApp'}>{eng?<EngineerHeader profile={ctx.profile} eyebrow="Artists"/>:<header className="mobileTop"><div><p className="eyebrow">CRM</p><h1>Artists.</h1><p className="muted">Search, register and grow client relationships.</p></div><AdminNav profile={ctx.profile}/></header>}
   <section className={eng?'engWelcome compact':'mobileSection'}><p className="eyebrow">Artist database</p><h1>{showNew?'Register artist':'Find an artist.'}</h1><p>{showNew?'Capture the essentials once. Their profile grows with every session.':'Search by artist name, legal name, email or phone.'}</p></section>
   {showNew?<section className="engSection"><CustomerCreateForm compact/></section>:<>
   <section className="engSearchBar"><form><input name="q" defaultValue={q} placeholder="Search artists…" autoComplete="off"/><button>Search</button></form><Link href="/admin/artists?new=1" className="engNewButton">＋ New artist</Link></section>
   <section className="engSection"><div className="engSectionHead"><div><h2>{q?'Search results':'Recent artists'}</h2><p>{customers.length} artist{customers.length===1?'':'s'}</p></div></div><div className="engArtistList">{customers.map(c=><Link key={c.id} href={`/admin/artists/${c.id}`} className="engArtistRow"><div className="engAvatar">{(c.artist_name||c.full_name||'?').slice(0,1).toUpperCase()}</div><div><b>{c.artist_name||c.full_name}</b><small>{c.full_name}{c.preferred_genre?' · '+c.preferred_genre:''}</small></div><span>→</span></Link>)}{!customers.length&&<div className="engEmpty"><b>No artists found.</b><p>Try another search or register a new artist.</p></div>}</div></section></>}
   {eng&&<EngineerBottomNav profile={ctx.profile}/>}</main>
}

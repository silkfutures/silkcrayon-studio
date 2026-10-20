import Link from 'next/link';
import {requireCustomer} from '../../../lib/customerAuth';
import {getAdminDb} from '../../../lib/supabase';
import DocumentActions from '../../../components/DocumentActions';
export const dynamic='force-dynamic';
export default async function Documents({searchParams}){
 const {customer}=await requireCustomer(),sp=await searchParams,offset=Math.max(0,Math.floor(Number(sp?.page)||0))*25,db=getAdminDb();
 const [{data:bookings,error:bError},{data:quotes,error:qError}]=await Promise.all([
 db.from('bookings').select('id,service_name,booking_date').eq('customer_id',customer.id).order('booking_date',{ascending:false}).range(offset,offset+24),
 db.from('studio_projects').select('id,title,quote_revision').eq('email',customer.email).order('created_at',{ascending:false}).range(offset,offset+24)]);
 if(bError||qError)throw new Error('Could not load documents. Please retry.');
 const {data:sent,error:sentError}=quotes.length?await db.from('project_quote_emails').select('project_id,revision').in('project_id',quotes.map(p=>p.id)).eq('status','sent'):{data:[]};if(sentError)throw sentError;const visibleQuotes=quotes.filter(p=>sent.some(s=>s.project_id===p.id));
 return <main className="customerPortal"><header className="portalTop"><Link href="/account">← My Studio</Link></header><section className="portalHero compact"><p className="eyebrow">Your paperwork</p><h1>Quotes &amp; receipts.</h1><p>Download current documents or an earlier saved version.</p></section><section className="portalSection"><h2>Session invoices &amp; receipts</h2>{bookings.map(b=><article key={b.id}><h3>{b.service_name} · {b.booking_date}</h3><DocumentActions id={b.id}/></article>)}{!bookings.length&&<p>No sessions on this page.</p>}<h2>Project quotes</h2>{visibleQuotes.map(p=><article key={p.id}><h3>{p.title}</h3><DocumentActions source="project" id={p.id}/></article>)}{!visibleQuotes.length&&<p>No sent quotes on this page.</p>}<div className="actions">{offset>0&&<Link href={`/account/documents?page=${offset/25-1}`}>← Previous</Link>}{(bookings.length===25||quotes.length===25)&&<Link href={`/account/documents?page=${offset/25+1}`}>Next →</Link>}</div></section></main>;
}

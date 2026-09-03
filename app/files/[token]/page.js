import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';
export default async function FilesReady({params}){
 const {token}=await params,db=getAdminDb();const {data:d}=await db.from('session_deliveries').select('*,bookings(service_name,booking_date),customers(artist_name,full_name)').eq('share_token',token).maybeSingle();if(!d)notFound();
 let href=d.external_url;if(d.storage_path){const {data}=await db.storage.from('session-deliveries').createSignedUrl(d.storage_path,3600,{download:d.file_name||true});href=data?.signedUrl||null}
 const artist=d.customers?.artist_name||d.customers?.full_name||'there';
 return <main className="filesReadyPage"><div className="filesReadyCard"><p className="eyebrow">Silkcrayon Studios</p><h1>Your files are ready.</h1><p>Hi {artist}, your latest Silkcrayon files are ready to collect.</p>{href?<a className="button primary filesDownload" href={href} target="_blank" rel="noreferrer">Open your files →</a>:<div className="portalNotice">This delivery link needs refreshing. Contact the studio and we’ll sort it.</div>}<div className="filesNextMove"><small>NEXT MOVE</small><h2>Keep building.</h2><p>Book the next session while the work is still fresh.</p><Link className="button outline" href="/booking">Book another session →</Link></div></div></main>
}

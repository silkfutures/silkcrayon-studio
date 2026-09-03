import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';
export default async function FilesReady({params}){
 const {token}=await params,db=getAdminDb();const {data:d}=await db.from('session_deliveries').select('*,bookings(service_name,booking_date),customers(artist_name,full_name)').eq('share_token',token).maybeSingle();if(!d)notFound();
 const expired=Boolean(d.delivery_type==='upload'&&d.expires_at&&new Date(d.expires_at).getTime()<=Date.now());
 let href=expired?null:d.external_url;if(!expired&&d.storage_path&&!d.deleted_at){const {data}=await db.storage.from('session-deliveries').createSignedUrl(d.storage_path,3600,{download:d.file_name||true});href=data?.signedUrl||null}
 const artist=d.customers?.artist_name||d.customers?.full_name||'there',expiry=d.expires_at?new Date(d.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}):null;
 return <main className="filesReadyPage"><div className="filesReadyCard"><p className="eyebrow">Silkcrayon Studios</p><h1>{expired?'This delivery has expired.':'Your files are ready.'}</h1><p>Hi {artist}, {expired?'this uploaded delivery has reached the end of its 30-day download window.':'your latest Silkcrayon files are ready to collect.'}</p>{!expired&&href?<><a className="button primary filesDownload" href={href} target="_blank" rel="noreferrer">Download your files →</a>{expiry&&<p className="filesExpiry">Available until {expiry}. Download and save your copy before then.</p>}</>:expired?<div className="portalNotice">Need the files again? Contact the studio and we can re-deliver them if they’re still available in the studio archive.</div>:<div className="portalNotice">This delivery link needs refreshing. Contact the studio and we’ll sort it.</div>}<div className="filesNextMove"><small>NEXT MOVE</small><h2>Keep building.</h2><p>Book the next session while the work is still fresh.</p><Link className="button outline" href="/booking">Book another session →</Link></div></div></main>
}

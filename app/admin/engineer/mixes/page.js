import Link from 'next/link';
import {requireStaff} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
export const dynamic='force-dynamic';
export default async function EngineerMixes(){
 const ctx=await requireStaff();const db=getAdminDb();
 let q=db.from('mix_jobs').select('id,track_title,status,created_at,customers(artist_name,full_name)').order('created_at',{ascending:false}).limit(80);
 if(ctx.profile.role!=='owner')q=q.eq('engineer_user_id',ctx.user.id);
 const {data:jobs=[],error}=await q;const {data:offers=[]}=await db.from('mix_engineer_offers').select('id,mix_job_id,fee_pence,mix_jobs(track_title)').eq('engineer_user_id',ctx.user.id).eq('status','pending');
 return <main className="adminPage"><p><Link href="/admin/engineer">← Engineer OS</Link></p><h1>Mixes</h1>{offers.length>0&&<section className="adminSection"><h2>Offers awaiting your response</h2>{offers.map(o=><p key={o.id}><strong>{o.mix_jobs?.track_title||'Mix offer'}</strong> · £{(o.fee_pence/100).toFixed(2)} <Link href={`/admin/engineer/mixes/${o.mix_job_id}`}>Listen and respond →</Link></p>)}</section>}{error?<p>{error.message}</p>:jobs.length?jobs.map(j=><article className="adminSection" key={j.id}><h2>{j.track_title}</h2><p>{j.customers?.artist_name||j.customers?.full_name} · {j.status}</p><Link href={`/admin/engineer/mixes/${j.id}`} className="button outline">Open mix →</Link></article>):<p>No mixes assigned.</p>}</main>;
}

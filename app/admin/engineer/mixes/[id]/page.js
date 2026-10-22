import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import MixDeliveryPanel from '../../../../../components/MixDeliveryPanel';
export const dynamic='force-dynamic';
export default async function EngineerMix({params}){
 const ctx=await requireStaff(),{id}=await params,db=getAdminDb();
 const {data:j}=await db.from('mix_jobs').select('id,track_title,status,engineer_user_id,paid_amount_pence,quoted_amount_pence').eq('id',id).maybeSingle();
 if(!j||(ctx.profile.role!=='owner'&&j.engineer_user_id!==ctx.user.id))notFound();
 const [{data:revisions=[]},{data:deliveries=[]},{data:payout}]=await Promise.all([db.from('mix_revisions').select('*').eq('mix_job_id',id).order('created_at',{ascending:false}),db.from('session_deliveries').select('id,file_name,engineer_notes,created_at').eq('mix_job_id',id).order('created_at',{ascending:false}),db.from('mix_engineer_payouts').select('status,amount_pence,error').eq('mix_job_id',id).maybeSingle()]);
 return <main className="adminPage"><p><Link href="/admin/engineer/mixes">← Back to assigned mixes</Link></p><h1>{j.track_title}</h1><p>Status: {j.status}</p>{payout&&<p>Engineer payment: £{(payout.amount_pence/100).toFixed(2)} · {payout.status}{payout.error?` · ${payout.error}`:''}</p>}
 <section className="adminSection"><h2>Client revision notes</h2>{revisions.map(r=><article className="revisionCard" key={r.id}><b>Revision {r.revision_number}</b><p style={{whiteSpace:'pre-wrap'}}>{r.client_notes}</p></article>)}</section>
 <section className="adminSection"><h2>Upload new version</h2>{Number(j.paid_amount_pence)>=Number(j.quoted_amount_pence)?<MixDeliveryPanel jobId={id} revisions={revisions}/>:<p>Customer payment required before delivery.</p>}</section>
 <section className="adminSection"><h2>Versions delivered</h2>{deliveries.map(d=><p key={d.id}>{d.file_name} · {new Date(d.created_at).toLocaleDateString('en-GB')}{d.engineer_notes?` · ${d.engineer_notes}`:''}</p>)}</section></main>;
}

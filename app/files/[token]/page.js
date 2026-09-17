import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getAdminDb} from '../../../lib/supabase';
import PublicMixReviewActions from '../../../components/PublicMixReviewActions';

export const dynamic='force-dynamic';

function bundleFromStoragePath(value){
  try{const parsed=JSON.parse(String(value||''));return Array.isArray(parsed)?parsed.filter(item=>item?.path):null}catch{return null}
}

export default async function FilesReady({params}){
  const {token}=await params,db=getAdminDb();
  const {data:d}=await db.from('session_deliveries').select('*,bookings(service_name,booking_date),customers(artist_name,full_name)').eq('share_token',token).maybeSingle();
  if(!d)notFound();

  const bundle=d.delivery_type==='upload'?bundleFromStoragePath(d.storage_path):null;
  const expired=Boolean(d.delivery_type==='upload'&&d.expires_at&&new Date(d.expires_at).getTime()<=Date.now());
  const available=!expired&&!d.deleted_at&&(d.external_url||d.storage_path);
  const artist=d.customers?.artist_name||d.customers?.full_name||'there';
  const expiry=d.expires_at?new Date(d.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}):null;

  let mix=null,revisionCount=0,isLatestMixDelivery=true,revisionPending=false;
  if(d.mix_job_id){
    const [{data:job},{count},{data:latest},{data:latestRevision}]=await Promise.all([
      db.from('mix_jobs').select('id,track_title,status,included_revisions').eq('id',d.mix_job_id).maybeSingle(),
      db.from('mix_revisions').select('id',{count:'exact',head:true}).eq('mix_job_id',d.mix_job_id),
      db.from('session_deliveries').select('share_token,created_at').eq('mix_job_id',d.mix_job_id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
      db.from('mix_revisions').select('id,created_at').eq('mix_job_id',d.mix_job_id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    mix=job||null;revisionCount=Number(count||0);isLatestMixDelivery=latest?.share_token===token;revisionPending=Boolean(latestRevision?.created_at&&latest?.created_at&&new Date(latestRevision.created_at).getTime()>new Date(latest.created_at).getTime());
  }

  const heading=expired?'This delivery has expired.':mix?'Your mix is ready to review.':'Your files are ready.';
  const intro=expired?'this uploaded delivery has reached the end of its 30-day download window.':mix?`your latest ${mix.track_title||'mix'} files are ready. Download or open them below, then approve the mix when it feels right.`:'your latest Silkcrayon files are ready to collect.';

  return <main className="filesReadyPage"><div className="filesReadyCard">
    <p className="eyebrow">Silkcrayon Studios</p><h1>{heading}</h1><p>Hi {artist}, {intro}</p>
    {available?bundle?.length?<div className="filesBundle"><div className="filesBundleHead"><b>{bundle.length} files</b><small>{mix?'One delivery · review everything below':'Download each file below.'}</small></div>{bundle.map((file,index)=><a className="clientDelivery" key={`${file.path}-${index}`} href={`/files/${token}/download?file=${index}`}><div><b>{file.name||`File ${index+1}`}</b><small>Secure download</small></div><span>Download →</span></a>)}{expiry&&<p className="filesExpiry">Available until {expiry}. Download and save your copies before then.</p>}</div>:<><a className="button primary filesDownload" href={`/files/${token}/download`}>{mix?'Open mix file →':'Download your files →'}</a>{expiry&&<p className="filesExpiry">Available until {expiry}. Download and save your copy before then.</p>}</>:expired?<div className="portalNotice">Need the files again? Contact the studio and we can re-deliver them if they’re still available in the studio archive.</div>:<div className="portalNotice">This delivery link needs refreshing. Contact the studio and we’ll sort it.</div>}

    {mix&&!expired&&!d.deleted_at?(isLatestMixDelivery?(revisionPending?<div className="portalNotice success"><b>Revision request received ✓</b><span>Silkcrayon has your notes. We’ll send a fresh review link when the next version is ready.</span></div>:<PublicMixReviewActions token={token} initialStatus={mix.status} revisionCount={revisionCount} includedRevisions={mix.included_revisions}/>):<div className="portalNotice"><b>A newer mix version has been sent.</b><span>Use the most recent Silkcrayon email or text to review and approve the latest version.</span></div>):null}

    {!mix&&<div className="filesNextMove"><small>NEXT MOVE</small><h2>Keep building.</h2><p>Book the next session while the work is still fresh.</p><Link className="button outline" href="/booking">Book another session →</Link></div>}
  </div></main>;
}

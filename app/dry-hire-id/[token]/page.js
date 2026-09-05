import {getAdminDb} from '../../../lib/supabase';
import {idTokenHash} from '../../../lib/dryHireId';
import DryHireIdUploadForm from '../../../components/DryHireIdUploadForm';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Dry Hire ID Check — Silkcrayon',robots:{index:false,follow:false,noarchive:true,nosnippet:true}};

function dateLabel(v){try{return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`))}catch{return v}}
export default async function DryHireIdPage({params}){
 const {token}=await params; const db=getAdminDb(); const hash=idTokenHash(token);
 const {data:check}=await db.from('dry_hire_id_checks').select('id,status,expires_at,submitted_at,verified_at,bookings(booking_date,start_time,service_name,status),customers(full_name,artist_name,dry_hire_id_verified_at)').eq('token_hash',hash).maybeSingle();
 if(!check||new Date(check.expires_at).getTime()<Date.now())return <main className="idCheckPage"><section className="idCheckShell"><p className="eyebrow">Silkcrayon · Dry Hire</p><h1>This ID link has expired.</h1><p>For security, ID-check links are time limited. Contact Silkcrayon or ask us to resend the ID request from your booking.</p></section></main>;
 const b=check.bookings,c=check.customers,verified=Boolean(check.customers?.dry_hire_id_verified_at),active=['pending','confirmed'].includes(String(check.bookings?.status||''));
 return <main className="idCheckPage"><section className="idCheckShell"><p className="eyebrow">Silkcrayon · Dry Hire</p><h1>Lead hirer ID check.</h1><p className="idCheckLede">{c?.artist_name||c?.full_name||'Your'} dry hire · {dateLabel(b?.booking_date)} · {String(b?.start_time||'').slice(0,5)}</p>
  {!active?<div className="idCheckSubmitted"><span>×</span><h2>This booking is no longer active.</h2><p>No ID upload is required. If you have another Dry Hire booking, use the secure link sent for that booking.</p></div>:verified?<div className="idCheckComplete"><span>✓</span><h2>ID verified.</h2><p>You’re all set for your dry hire. You do not need to upload ID again for future Silkcrayon dry hires unless we ask you to re-verify.</p></div>:check.status==='verified'?<div className="idCheckSubmitted"><span>↻</span><h2>This link is no longer active.</h2><p>Silkcrayon has requested a fresh ID check. Please use the newest secure link we sent you.</p></div>:check.status==='submitted'?<div className="idCheckSubmitted"><span>⌁</span><h2>ID received.</h2><p>Your upload is waiting for owner review. You don’t need to submit it again.</p></div>:<><div className="idCheckIntro"><h2>Quick, secure verification.</h2><p>Dry hire is self-operated, so the lead hirer must be 18+ and verified before studio access. Upload a clear photo of a driving licence or passport.</p></div><DryHireIdUploadForm token={token}/></>}
  <p className="idCheckFooter">We keep the verification record, not the ID photo. Read the <a href="/privacy">Privacy Policy</a> and <a href="/dry-hire-terms">Dry Hire Terms</a>.</p></section></main>;
}

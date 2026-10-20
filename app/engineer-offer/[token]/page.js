import {getAdminDb} from '../../../lib/supabase';
import {offerByToken,advanceOfferQueue} from '../../../lib/engineerOffers';
import {formatGBP} from '../../../lib/services';
import {prettyDate,prettyDeadline} from '../../../lib/engineerWorkEmails';
import EngineerOfferResponse from '../../../components/EngineerOfferResponse';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Session offer — Silkcrayon',robots:{index:false,follow:false,noarchive:true,nosnippet:true}};

const CLOSED={accepted:['✓','You accepted this session.','It’s in your Today list in Studio OS.'],declined:['×','You declined this session.','Thanks for letting the studio know.'],expired:['⌛','This offer has expired.','The response window ended, so it moved to another engineer.'],cancelled:['×','This offer is closed.','']};

export default async function OfferPage({params,searchParams}){
 const {token}=await params,sp=await searchParams,db=getAdminDb();
 let offer=await offerByToken(db,token);
 if(offer?.status==='sent'&&new Date(offer.expires_at).getTime()<=Date.now()){await advanceOfferQueue(db,offer.booking_id);offer=await offerByToken(db,token);}
 const shell=body=><main className="idCheckPage"><section className="idCheckShell"><p className="eyebrow">Silkcrayon · Session offer</p>{body}</section></main>;
 if(!offer)return shell(<><h1>Offer not found.</h1><p>This link isn’t valid. Open Studio OS to see your sessions.</p></>);
 const {data:b}=await db.from('bookings').select('booking_date,start_time,end_time,duration_minutes,service_name,genre,notes,status,customers(artist_name,full_name)').eq('id',offer.booking_id).maybeSingle();
 const details=b&&<div className="idCheckIntro"><h2 style={{margin:'0 0 6px'}}>{b.customers?.artist_name||b.customers?.full_name||'Artist'}</h2><p style={{margin:0}}>{b.service_name}<br/>{prettyDate(b.booking_date)} · {String(b.start_time).slice(0,5)}–{String(b.end_time).slice(0,5)} ({Number(b.duration_minutes)/60}h)</p>{b.genre&&<p style={{margin:'8px 0 0'}}>Genre: {b.genre}</p>}<p style={{margin:'12px 0 0'}}>Your fee: <b>{offer.fee_pence!=null?formatGBP(offer.fee_pence):'to be confirmed by the studio'}</b>{offer.pay_hourly_pence!=null&&<span style={{color:'#aaa1ae'}}> · {formatGBP(offer.pay_hourly_pence)}/hour</span>}</p></div>;
 if(offer.status!=='sent'){const [icon,title,text]=CLOSED[offer.status]||CLOSED.cancelled;return shell(<><h1>Hi {offer.engineer_name}.</h1>{details}<div className="idCheckSubmitted"><span>{icon}</span><h2>{title}</h2>{(offer.close_reason||text)&&<p>{offer.status==='cancelled'&&offer.close_reason?offer.close_reason:text}</p>}</div><p className="idCheckFooter"><a href="/admin/engineer">Open Studio OS →</a></p></>);}
 return shell(<><h1>Can you take this session, {offer.engineer_name}?</h1>{details}<p style={{color:'#f4c46a',fontWeight:800}}>Respond by {prettyDeadline(offer.expires_at)}</p><EngineerOfferResponse token={token} initialChoice={sp?.choice||null}/><p className="idCheckFooter">This link is personal to you. Nothing changes until you press a button on this page.</p></>);
}

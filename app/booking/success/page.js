export const metadata={robots:{index:false,follow:false}};
import Link from "next/link";
import GoogleAdsPurchaseConversion from "../../../components/GoogleAdsPurchaseConversion";
import {formatUkDate} from "../../../lib/dates";
import {getStripe} from "../../../lib/stripe";
import {getAdminDb} from "../../../lib/supabase";
export const dynamic="force-dynamic";
function t(v){return String(v||"").slice(0,5)}

export default async function Success({searchParams}){
 const {session_id}=await searchParams;let b=null,first=false,paid=false,paidStripeSession=false;
 if(session_id){try{
  const session=await getStripe().checkout.sessions.retrieve(session_id),id=session.metadata?.booking_id;
  if(session.payment_status==="paid"&&id){
   paidStripeSession=true;
   const db=getAdminDb();const {data}=await db.from("bookings").select("*,customers(full_name,email,artist_name)").eq("id",id).single();
   if(data?.payment_status==="paid"&&["confirmed","completed"].includes(data.status)&&data.stripe_checkout_session_id===session.id){b=data;paid=true;}
   if(data?.customer_id){const {count}=await db.from("bookings").select("id",{count:"exact",head:true}).eq("customer_id",data.customer_id).in("status",["confirmed","completed"]);first=(count||0)<=1;}
  }
 }catch{}}
 const maps=process.env.STUDIO_MAP_URL||"https://www.google.com/maps/search/?api=1&query=Silkcrayon+Studios+Cardiff+Bay";
 const adsId=process.env.NEXT_PUBLIC_GOOGLE_ADS_ID||"AW-18437935262",label=process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL||"";
 return <main className="successPage"><div className="successWrap">
  {paidStripeSession&&<GoogleAdsPurchaseConversion sessionId={session_id} adsId={adsId} conversionLabel={label}/>}<p className="eyebrow">Booking confirmed</p><h1>You’re booked in.</h1>
  {b?<><div className="successDetails"><div><small>SESSION</small><strong>{b.service_name}</strong></div><div><small>DATE</small><strong>{formatUkDate(b.booking_date)}</strong></div><div><small>TIME</small><strong>{t(b.start_time)}–{t(b.end_time)}</strong></div><div><small>PAYMENT</small><strong>£{(Number(b.amount_pence||0)/100).toFixed(2)} · Paid</strong></div></div><p className="successLead">We’ve sent your confirmation and everything you need to know to <b>{b.customers?.email}</b>.</p>{first&&<div className="firstVisit"><span>FIRST TIME?</span><h2>Your first Silkcrayon session.</h2><p>Arrive 5–10 minutes early and bring any beats, stems, references or files you need. Your engineer will get you settled and ready to create.</p></div>}<div className="successActions"><Link className="button primary" href="/account/login">Open My Studio →</Link><a className="button outline" href={maps} target="_blank" rel="noreferrer">Get directions</a></div><p className="bookingRef">Booking reference · {String(b.id).slice(0,8).toUpperCase()}</p></>:<p className="successLead">Your payment has completed. Your confirmation email should arrive shortly.</p>}
  <Link className="successHome" href="/">← Back to Silkcrayon</Link>
 </div></main>;
}

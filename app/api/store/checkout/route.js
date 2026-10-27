import {publicFormGuard} from "../../../../lib/publicFormGuard";
import {NextResponse} from "next/server";
import {getAdminDb} from "../../../../lib/supabase";
import {getStripe} from "../../../../lib/stripe";
import {rateLimit} from "../../../../lib/rateLimit";
import {getPromotionFor} from "../../../../lib/promotions";
import {getStudioSettings} from "../../../../lib/studioSettings";

const GIFTS=[1,2,3,4,5,6,7,8];
const RELAUNCH_CODE="RELAUNCH_2H_100";

function clean(v,n=254){return String(v||"").trim().slice(0,n)}

export async function POST(req){
  let submitted;try{submitted=await req.clone().json()}catch{return NextResponse.json({error:'Invalid form submission.'},{status:400})}
  const blocked=await publicFormGuard(req,submitted,{lead:false});
  if(blocked)return blocked;

 try{
  const b=await req.json();
  const requestedHours=Number(b.hours);
  const kind=b.kind==="gift"?"gift":b.kind==="relaunch"?"relaunch":b.kind==="relaunch40"?"relaunch40":b.kind==="project_pass"?"project_pass":b.kind==="studio_pass"?"studio_pass":"hours";
  const hours=kind==="relaunch"||kind==="relaunch40"?2:kind==="project_pass"?6:requestedHours;
  if(kind==="studio_pass"&&(!Number.isInteger(hours)||hours<4||hours>8))return NextResponse.json({error:"Choose 4–8 hours for your Studio Pass."},{status:400});
  if(kind==="gift"&&!GIFTS.includes(hours))return NextResponse.json({error:"Choose between 1 and 8 gift hours."},{status:400});
  if(kind==="hours"&&(!Number.isInteger(hours)||hours<3||hours>10))return NextResponse.json({error:"Choose a studio-hour pack between 3 and 10 hours."},{status:400});
  if(kind==="relaunch40"){
   const now=Date.now(),start=Date.parse('2026-10-30T00:00:00Z'),end=Date.parse('2026-11-03T00:00:00Z');
   if(now<start||now>=end)return NextResponse.json({error:"RELAUNCH40 is available from 30 October to 2 November 2026 only."},{status:410});
  }
  const relaunch=kind==="relaunch"?await getPromotionFor("vocal-recording",120):null;
  if(kind==="relaunch"&&!relaunch)return NextResponse.json({error:"The relaunch offer is not currently available."},{status:410});

  const buyerName=clean(b.buyerName,120);
  const buyerEmail=clean(b.buyerEmail).toLowerCase();
  const recipientName=clean(b.recipientName||buyerName,120);
  const recipientEmail=clean(b.recipientEmail||buyerEmail).toLowerCase();
  const message=clean(b.message,500);
  if(!buyerName||!buyerEmail.includes("@")||!recipientName||!recipientEmail.includes("@")){
   return NextResponse.json({error:"Enter valid name and email details."},{status:400});
  }
  if((kind==="relaunch"||kind==="relaunch40")&&recipientEmail!==buyerEmail)return NextResponse.json({error:"The relaunch offer must be purchased for your own studio account."},{status:400});

  if(!await rateLimit(req,{scope:"store-checkout",limit:12,windowSeconds:3600,identity:buyerEmail})){
   return NextResponse.json({error:"Too many checkout attempts. Please try again later."},{status:429});
  }

  const db=getAdminDb();
  let {data:customer}=await db.from("customers").select("*").eq("email",recipientEmail).maybeSingle();
  if(customer){
   await db.from("customers").update({full_name:customer.full_name||recipientName,updated_at:new Date().toISOString()}).eq("id",customer.id);
  }else{
   const {data,error}=await db.from("customers").insert({
    full_name:recipientName,email:recipientEmail,marketing_consent:false,
    sms_service_consent:false,sms_marketing_consent:false
   }).select().single();
   if(error)throw error;customer=data;
  }

  if(kind==="relaunch"||kind==="relaunch40"){
   const {data:used,error:ue}=await db.from("studio_payments").select("id,status").eq("customer_id",customer.id).eq("discount_code",kind==="relaunch40"?"RELAUNCH40":RELAUNCH_CODE).in("status",["paid"]).limit(1);
   if(ue)throw ue;
   if((used||[]).length)return NextResponse.json({error:"This Silkcrayon account has already used the 2 hours for £90 relaunch offer."},{status:409});
  }

  if(kind==="studio_pass"){
   const {error:tableError}=await db.from("studio_pass_purchases").select("payment_id").limit(1);
   if(tableError)return NextResponse.json({error:"Studio Pass setup is incomplete. Please contact the studio before purchasing."},{status:503});
  }
  const pricing=await getStudioSettings();
  const listAmount=Math.round(hours*pricing.studioHourlyPricePence);
  const amount=kind==="relaunch40"?8000:kind==="relaunch"?Number(relaunch.offer_price_pence):kind==="project_pass"?22500:kind==="studio_pass"?Math.round(hours*(hours>=8?3500:hours>=6?3750:4000)):listAmount;
  const description=kind==="gift"
   ? `${hours} studio hour${hours===1?"":"s"} — gift from ${buyerName}`
   :kind==="relaunch40"?"2 studio hours — RELAUNCH40":kind==="relaunch"
    ? "2 studio hours — Relaunch offer"
    :kind==="project_pass"?"6-hour project pass":kind==="studio_pass"?`${hours}-hour 30-day Studio Pass`: `${hours}-hour prepaid studio pack`;

  const {data:payment,error:pe}=await db.from("studio_payments").insert({
   customer_id:customer.id,kind:kind==="gift"?"gift":"package",description,
   amount_pence:amount,list_amount_pence:listAmount,hours_credit:hours,status:"pending",
   discount_code:kind==="relaunch40"?"RELAUNCH40":kind==="relaunch"?relaunch.code:null,
   discount_amount_pence:Math.max(0,listAmount-amount),
   created_by_name:kind==="gift"?buyerName:kind==="relaunch40"?"RELAUNCH40":kind==="relaunch"?"Relaunch offer":kind==="project_pass"?"Project pass":kind==="studio_pass"?"30-day Studio Pass":"Website"
  }).select().single();
  if(pe)throw pe;

  const stripe=getStripe();
  const configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');
  const base=(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))?'https://silkcrayon.com':configured;
  const productName=kind==="gift"
   ? `Silkcrayon — Gift ${hours} studio hour${hours===1?"":"s"}`
   :kind==="relaunch40"?"Silkcrayon — RELAUNCH40 / Two recording hours":kind==="relaunch"
    ? `Silkcrayon — 2 Hours for £${(amount/100).toFixed(amount%100?2:0)} Relaunch Offer`
    :kind==="project_pass"?"Silkcrayon — 6-Hour Project Pass":kind==="studio_pass"?`Silkcrayon — ${hours}-Hour 30-Day Studio Pass`: `Silkcrayon — ${hours}-Hour Studio Pack`;
  const productDescription=kind==="gift"
   ? `Studio-time gift for ${recipientName}`
   :kind==="relaunch40"?"Two studio hours. Book by 2 November 2026, sessions in November.":kind==="relaunch"
    ? "Limited relaunch offer. Two prepaid studio hours; choose the date later."
    :kind==="project_pass"?"6 prepaid studio hours, engineer included — book later":kind==="studio_pass"?"Engineer included. Sessions must take place within 30 calendar days of payment; unused hours expire.": `${hours} prepaid studio hours — choose your sessions later`;

  const session=await stripe.checkout.sessions.create({
   mode:"payment",invoice_creation:{enabled:true},customer_email:buyerEmail,
   client_reference_id:payment.id,
   metadata:{
    studio_payment_id:payment.id,customer_id:customer.id,payment_kind:kind,
    hours_credit:String(hours),buyer_name:buyerName,recipient_name:recipientName,
    recipient_email:recipientEmail,gift_message:message,offer_code:kind==="relaunch40"?"RELAUNCH40":kind==="relaunch"?relaunch.code:""
   },
   line_items:[{quantity:1,price_data:{currency:"gbp",unit_amount:amount,product_data:{name:productName,description:productDescription}}}],
   success_url:kind==="relaunch40"?`${base}/relaunch40?paid=1&session_id={CHECKOUT_SESSION_ID}`:kind==="relaunch"?`${base}/relaunch-offer?paid=1&session_id={CHECKOUT_SESSION_ID}`:`${base}/${kind==="gift"?"gift-studio-time":kind==="studio_pass"?"studio-pass":"buy-hours"}?paid=1&hours=${hours}&session_id={CHECKOUT_SESSION_ID}`,
   cancel_url:kind==="relaunch40"?`${base}/relaunch40?cancelled=1`:kind==="relaunch"?`${base}/relaunch-offer?cancelled=1`:`${base}/${kind==="gift"?"gift-studio-time":kind==="studio_pass"?"studio-pass":"buy-hours"}?cancelled=1`
  });

  await db.from("studio_payments").update({stripe_checkout_session_id:session.id}).eq("id",payment.id);
  return NextResponse.json({url:session.url});
 }catch(e){
  return NextResponse.json({error:e.message||"Could not start checkout."},{status:500});
 }
}

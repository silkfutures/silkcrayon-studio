import {NextResponse} from "next/server";
import {getAdminDb} from "../../../../lib/supabase";
import {getStripe} from "../../../../lib/stripe";
import {rateLimit} from "../../../../lib/rateLimit";
import {getPromotionFor} from "../../../../lib/promotions";

const PACKS={3:17000,4:22000,5:27000,6:32000,7:37000,8:42000,9:47000,10:52000};
const GIFTS=[1,2,3,4,5,6,7,8];
const RELAUNCH_CODE="RELAUNCH_2H_100";

function clean(v,n=254){return String(v||"").trim().slice(0,n)}

export async function POST(req){
 try{
  const b=await req.json();
  const requestedHours=Number(b.hours);
  const kind=b.kind==="gift"?"gift":b.kind==="relaunch"?"relaunch":"hours";
  const hours=kind==="relaunch"?2:requestedHours;
  if(kind==="gift"&&!GIFTS.includes(hours))return NextResponse.json({error:"Choose between 1 and 8 gift hours."},{status:400});
  if(kind==="hours"&&!PACKS[hours])return NextResponse.json({error:"Choose a studio-hour pack between 3 and 10 hours."},{status:400});
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
  if(kind==="relaunch"&&recipientEmail!==buyerEmail)return NextResponse.json({error:"The relaunch offer must be purchased for your own studio account."},{status:400});

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

  if(kind==="relaunch"){
   const {data:used,error:ue}=await db.from("studio_payments").select("id,status").eq("customer_id",customer.id).eq("discount_code",RELAUNCH_CODE).in("status",["paid"]).limit(1);
   if(ue)throw ue;
   if((used||[]).length)return NextResponse.json({error:"This Silkcrayon account has already used the 2 hours for £100 relaunch offer."},{status:409});
  }

  const amount=kind==="relaunch"?Number(relaunch.offer_price_pence):kind==="gift"?hours*6000:PACKS[hours];
  const listAmount=hours*6000;
  const description=kind==="gift"
   ? `${hours} studio hour${hours===1?"":"s"} — gift from ${buyerName}`
   :kind==="relaunch"
    ? "2 studio hours — Relaunch offer"
    : `${hours}-hour prepaid studio pack`;

  const {data:payment,error:pe}=await db.from("studio_payments").insert({
   customer_id:customer.id,kind:kind==="gift"?"gift":"package",description,
   amount_pence:amount,list_amount_pence:listAmount,hours_credit:hours,status:"pending",
   discount_code:kind==="relaunch"?relaunch.code:null,
   discount_amount_pence:Math.max(0,listAmount-amount),
   created_by_name:kind==="gift"?buyerName:kind==="relaunch"?"Relaunch offer":"Website"
  }).select().single();
  if(pe)throw pe;

  const stripe=getStripe();
  const configured=String(process.env.NEXT_PUBLIC_SITE_URL||'').trim().replace(/\/$/,'');
  const base=(!configured||/silkcrayon-studio\.vercel\.app/i.test(configured))?'https://silkcrayon.com':configured;
  const productName=kind==="gift"
   ? `Silkcrayon — Gift ${hours} studio hour${hours===1?"":"s"}`
   :kind==="relaunch"
    ? "Silkcrayon — 2 Hours for £100 Relaunch Offer"
    : `Silkcrayon — ${hours}-Hour Studio Pack`;
  const productDescription=kind==="gift"
   ? `Studio-time gift for ${recipientName}`
   :kind==="relaunch"
    ? "Limited relaunch offer. Two prepaid studio hours; choose the date later."
    : `${hours} prepaid studio hours — choose your sessions later`;

  const session=await stripe.checkout.sessions.create({
   mode:"payment",invoice_creation:{enabled:true},customer_email:buyerEmail,
   client_reference_id:payment.id,
   metadata:{
    studio_payment_id:payment.id,customer_id:customer.id,payment_kind:kind,
    hours_credit:String(hours),buyer_name:buyerName,recipient_name:recipientName,
    recipient_email:recipientEmail,gift_message:message,offer_code:kind==="relaunch"?relaunch.code:""
   },
   line_items:[{quantity:1,price_data:{currency:"gbp",unit_amount:amount,product_data:{name:productName,description:productDescription}}}],
   success_url:kind==="relaunch"?`${base}/relaunch-offer?paid=1`:`${base}/${kind==="gift"?"gift-studio-time":"buy-hours"}?paid=1&hours=${hours}`,
   cancel_url:kind==="relaunch"?`${base}/relaunch-offer?cancelled=1`:`${base}/${kind==="gift"?"gift-studio-time":"buy-hours"}?cancelled=1`
  });

  await db.from("studio_payments").update({stripe_checkout_session_id:session.id}).eq("id",payment.id);
  return NextResponse.json({url:session.url});
 }catch(e){
  return NextResponse.json({error:e.message||"Could not start checkout."},{status:500});
 }
}

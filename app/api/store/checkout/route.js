import {NextResponse} from "next/server";
import {getAdminDb} from "../../../../lib/supabase";
import {getStripe} from "../../../../lib/stripe";
import {rateLimit} from "../../../../lib/rateLimit";

const ALLOWED=[1,2,3,4,5,6,7,8];
function clean(v,n=254){return String(v||"").trim().slice(0,n)}

export async function POST(req){
 try{
  const b=await req.json();
  const hours=Number(b.hours);
  const kind=b.kind==="gift"?"gift":"hours";
  if(!ALLOWED.includes(hours)) return NextResponse.json({error:"Choose between 1 and 8 studio hours."},{status:400});

  const buyerName=clean(b.buyerName,120);
  const buyerEmail=clean(b.buyerEmail).toLowerCase();
  const recipientName=clean(b.recipientName||buyerName,120);
  const recipientEmail=clean(b.recipientEmail||buyerEmail).toLowerCase();
  const message=clean(b.message,500);
  if(!buyerName||!buyerEmail.includes("@")||!recipientName||!recipientEmail.includes("@")){
   return NextResponse.json({error:"Enter valid name and email details."},{status:400});
  }

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
   if(error) throw error;
   customer=data;
  }

  const amount=hours*6000;
  const description=kind==="gift"
   ? `${hours} studio hour${hours===1?"":"s"} — gift from ${buyerName}`
   : `${hours} prepaid studio hour${hours===1?"":"s"}`;

  const {data:payment,error:pe}=await db.from("studio_payments").insert({
   customer_id:customer.id,kind:kind==="gift"?"gift":"package",description,
   amount_pence:amount,list_amount_pence:amount,hours_credit:hours,status:"pending",
   created_by_name:kind==="gift"?buyerName:"Website"
  }).select().single();
  if(pe) throw pe;

  const stripe=getStripe();
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
  const productName=kind==="gift"
   ? `Silkcrayon — Gift ${hours} studio hour${hours===1?"":"s"}`
   : `Silkcrayon — ${hours} prepaid studio hour${hours===1?"":"s"}`;
  const productDescription=kind==="gift"
   ? `Studio-time gift for ${recipientName}`
   : "Prepaid studio time — choose the date later";

  const session=await stripe.checkout.sessions.create({
   mode:"payment",
   invoice_creation:{enabled:true},
   customer_email:buyerEmail,
   client_reference_id:payment.id,
   metadata:{
    studio_payment_id:payment.id,customer_id:customer.id,payment_kind:kind,
    hours_credit:String(hours),buyer_name:buyerName,recipient_name:recipientName,
    recipient_email:recipientEmail,gift_message:message
   },
   line_items:[{
    quantity:1,
    price_data:{
     currency:"gbp",
     unit_amount:amount,
     product_data:{name:productName,description:productDescription}
    }
   }],
   success_url:`${base}/${kind==="gift"?"gift-studio-time":"buy-hours"}?paid=1`,
   cancel_url:`${base}/${kind==="gift"?"gift-studio-time":"buy-hours"}?cancelled=1`
  });

  await db.from("studio_payments").update({stripe_checkout_session_id:session.id}).eq("id",payment.id);
  return NextResponse.json({url:session.url});
 }catch(e){
  return NextResponse.json({error:e.message||"Could not start checkout."},{status:500});
 }
}

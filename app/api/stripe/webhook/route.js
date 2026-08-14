import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { getAdminDb } from "../../../../lib/supabase";
import { sendLoggedNotification, sendStaffLoggedNotification, confirmationEmail, newBookingOwnerEmail, ownerEmails, packagePurchaseEmail, mixMasterPurchaseEmail, sendEmail } from "../../../../lib/notifications";
import { newToken, tokenHash } from "../../../../lib/customerAuth";

export async function POST(request) {
  try {
    const stripe = getStripe();
    const signature = request.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) return new NextResponse("Webhook not configured", { status: 400 });
    const raw = await request.text();
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    const db = getAdminDb();
    async function invoiceFields(session){
      if(!session.invoice) return {};
      try{
        const inv=await stripe.invoices.retrieve(typeof session.invoice==='string'?session.invoice:session.invoice.id);
        return {stripe_invoice_id:inv.id,stripe_invoice_number:inv.number||null,stripe_invoice_url:inv.hosted_invoice_url||null,stripe_invoice_pdf:inv.invoice_pdf||null};
      }catch{return {stripe_invoice_id:typeof session.invoice==='string'?session.invoice:session.invoice?.id||null};}
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const studioPaymentId = session.metadata?.studio_payment_id;
      if (studioPaymentId) {
        const { data: payment } = await db.from('studio_payments').select('*').eq('id', studioPaymentId).maybeSingle();
        if (payment && payment.status !== 'paid') {
          const inv=await invoiceFields(session); await db.from('studio_payments').update({status: session.payment_status === 'paid' ? 'paid' : 'pending',stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,paid_at: session.payment_status === 'paid' ? new Date().toISOString() : null,updated_at: new Date().toISOString(),...inv}).eq('id', studioPaymentId);
          const hours = Number(payment.hours_credit || 0);
          if(session.payment_status==='paid'){
            const {data:customer}=await db.from('customers').select('*').eq('id',payment.customer_id).maybeSingle();
            if(hours>0){await db.from('credit_ledger').insert({customer_id:payment.customer_id,payment_id:payment.id,hours_delta:hours,note:payment.description,created_by_user_id:payment.created_by_user_id});if(customer?.email){const msg=packagePurchaseEmail(payment,customer);await sendEmail({to:customer.email,...msg});}}
            if(payment.kind==='mix_master'&&customer?.email){const msg=mixMasterPurchaseEmail(payment,customer);await sendEmail({to:customer.email,...msg});}
          }
        }
      } else {
        const id = session.metadata?.booking_id || session.client_reference_id;
        if (id) {
          const inv=await invoiceFields(session); await db.from("bookings").update({ status: "confirmed", payment_status: session.payment_status === "paid" ? "paid" : "unpaid", stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null, hold_expires_at: null, updated_at: new Date().toISOString(), ...inv }).eq("id", id);
          if (session.payment_status === "paid") {
            const { data: booking } = await db.from("bookings").select("*,customers(*)").eq("id", id).maybeSingle();
            if(booking){const {data:history=[]}=await db.from("bookings").select("id,amount_pence,payment_status").eq("customer_id",booking.customer_id).in("status",["confirmed","completed"]);const paid=(history||[]).filter(x=>x.payment_status==="paid");const stats={firstTime:paid.length<=1,bookingCount:paid.length,lifetimeSpendPence:paid.reduce((n,x)=>n+Number(x.amount_pence||0),0)};if(booking.customers?.email){let portalUrl=null;try{const token=newToken(),expires=new Date(Date.now()+7*24*60*60*1000).toISOString();const {error:tokenError}=await db.from('customer_access_tokens').insert({customer_id:booking.customer_id,token_hash:tokenHash(token),expires_at:expires});if(!tokenError)portalUrl=`${process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin}/account/access?token=${encodeURIComponent(token)}`;}catch{}const msg=confirmationEmail(booking,booking.customers,{firstTime:stats.firstTime,portalUrl});await sendLoggedNotification({booking,customer:booking.customers,type:"booking_confirmation",...msg});}const owners=await ownerEmails();const msg=newBookingOwnerEmail(booking,booking.customers||{},stats);for(const email of owners)await sendStaffLoggedNotification({booking,type:'owner_new_booking',to:email,...msg});}
          }
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const studioPaymentId = session.metadata?.studio_payment_id;
      if (studioPaymentId) await db.from('studio_payments').update({status:'expired',updated_at:new Date().toISOString()}).eq('id',studioPaymentId).eq('status','pending');
      else { const id = session.metadata?.booking_id || session.client_reference_id; if (id) await db.from("bookings").update({ status: "cancelled", hold_expires_at: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "pending"); }
    }
    return NextResponse.json({ received: true });
  } catch (e) { return new NextResponse(`Webhook error: ${e.message}`, { status: 400 }); }
}

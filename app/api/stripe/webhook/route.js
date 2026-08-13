import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { getAdminDb } from "../../../../lib/supabase";
import { sendLoggedNotification, sendStaffLoggedNotification, confirmationEmail, newBookingOwnerEmail, ownerEmails } from "../../../../lib/notifications";

export async function POST(request) {
  try {
    const stripe = getStripe();
    const signature = request.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) return new NextResponse("Webhook not configured", { status: 400 });
    const raw = await request.text();
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    const db = getAdminDb();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const studioPaymentId = session.metadata?.studio_payment_id;
      if (studioPaymentId) {
        const { data: payment } = await db.from('studio_payments').select('*').eq('id', studioPaymentId).maybeSingle();
        if (payment && payment.status !== 'paid') {
          await db.from('studio_payments').update({status: session.payment_status === 'paid' ? 'paid' : 'pending',stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,paid_at: session.payment_status === 'paid' ? new Date().toISOString() : null,updated_at: new Date().toISOString()}).eq('id', studioPaymentId);
          const hours = Number(payment.hours_credit || 0);
          if (session.payment_status === 'paid' && hours > 0) await db.from('credit_ledger').insert({customer_id: payment.customer_id,payment_id: payment.id,hours_delta: hours,note: payment.description,created_by_user_id: payment.created_by_user_id});
        }
      } else {
        const id = session.metadata?.booking_id || session.client_reference_id;
        if (id) {
          await db.from("bookings").update({ status: "confirmed", payment_status: session.payment_status === "paid" ? "paid" : "unpaid", stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null, hold_expires_at: null, updated_at: new Date().toISOString() }).eq("id", id);
          if (session.payment_status === "paid") {
            const { data: booking } = await db.from("bookings").select("*,customers(*)").eq("id", id).maybeSingle();
            if (booking?.customers?.email) { const msg=confirmationEmail(booking,booking.customers); await sendLoggedNotification({booking,customer:booking.customers,type:"booking_confirmation",...msg}); }
            if(booking){ const owners=await ownerEmails(); const msg=newBookingOwnerEmail(booking,booking.customers||{}); for(const email of owners) await sendStaffLoggedNotification({booking,type:'owner_new_booking',to:email,...msg}); }
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

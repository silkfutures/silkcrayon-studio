import Link from "next/link";
import { getStripe } from "../../../lib/stripe";
import { getAdminDb } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export default async function Success({ searchParams }) {
  const { session_id } = await searchParams;
  let booking = null;
  if (session_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const id = session.metadata?.booking_id;
      if (id) {
        const db = getAdminDb();
        const { data } = await db.from("bookings").select("*, customers(full_name,email,artist_name)").eq("id", id).single();
        booking = data;
      }
    } catch {}
  }
  return <main className="successPage"><div className="successCard"><p className="eyebrow">Booking received</p><h1>You’re booked in.</h1>{booking?<><p><strong>{booking.service_name}</strong></p><p>{booking.booking_date} · {String(booking.start_time).slice(0,5)}–{String(booking.end_time).slice(0,5)}</p><p className="muted">We’ve stored your booking and payment status. V2 will add branded confirmation and reminder emails.</p></>:<p>Your payment has completed. If this page doesn’t show the session details yet, the Stripe webhook may still be updating it.</p>}<Link className="button primary" href="/">Back to Silkcrayon</Link></div></main>;
}

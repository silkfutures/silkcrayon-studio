import Link from "next/link";
import { Suspense } from "react";
import BookingFlow from "../../components/BookingFlow";
import ScrollToTop from "../../components/ScrollToTop";
import {getLivePromotions,publicPromotion} from "../../lib/promotions";

export const metadata = { title: "Book — Silkcrayon Studios" };
export const dynamic="force-dynamic";
export default async function BookingPage() {
  const promotions=(await getLivePromotions()).filter(p=>p.show_on_booking).map(publicPromotion);
  return <main className="bookingPage"><ScrollToTop/><header className="bookingHeader"><Link href="/" className="brand"><img src="/logo.png" alt="Silkcrayon"/></Link><Link href="/">← Back to studio</Link></header><section className="bookingHero"><p className="eyebrow">Book Silkcrayon</p><h1>Choose a session.<br/><span>Leave with progress.</span></h1><p>Live availability, secure payment and your booking stored in one place.</p></section><div className="container"><Suspense fallback={<p>Loading booking system…</p>}><BookingFlow promotions={promotions}/></Suspense></div></main>;
}

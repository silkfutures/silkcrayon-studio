import "./booking.css";
import Link from "next/link";
import { Suspense } from "react";
import BookingFlow from "../../components/BookingFlow";
import ScrollToTop from "../../components/ScrollToTop";
import {getLivePromotions,publicPromotion} from "../../lib/promotions";
import {getStudioSettings} from "../../lib/studioSettings";

export const metadata = { title: "Book — Silkcrayon Studios" };
export const dynamic="force-dynamic";
export default async function BookingPage() {
  const promotions=(await getLivePromotions()).filter(p=>p.show_on_booking).map(publicPromotion);
  const pricing=await getStudioSettings();
  return <main className="bookingPage"><ScrollToTop/><header className="bookingHeader"><Link href="/" className="brand"><img src="/logo.png" alt="Silkcrayon"/></Link><Link href="/">← Back to studio</Link></header><section className="bookingHero"><h1>Book your session.</h1></section><div className="container"><Suspense fallback={<p>Loading booking system…</p>}><BookingFlow promotions={promotions} pricing={pricing}/></Suspense><nav className="bookingExtras" aria-label="Other studio options"><a href="/mix-request">Mixing & mastering</a><a href="/buy-hours">Studio hour packs</a><a href="/gift-studio-time">Gift studio time</a></nav></div></main>;
}

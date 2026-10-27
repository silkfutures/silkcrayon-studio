import "./booking.css";
import Link from "next/link";
import { Suspense } from "react";
import BookingModeChooser from "../../components/BookingModeChooser";
import ScrollToTop from "../../components/ScrollToTop";
import {getLivePromotions,publicPromotion} from "../../lib/promotions";
import {getStudioSettings} from "../../lib/studioSettings";

export const metadata = { title: "Book — Silkcrayon Studios" };
export const dynamic="force-dynamic";
export default async function BookingPage() {
  const promotions=(await getLivePromotions()).filter(p=>p.show_on_booking && !String(p.code||" ").toLowerCase().includes("relaunch")).map(publicPromotion);
  const pricing=await getStudioSettings();
  return <main className="bookingPage"><ScrollToTop/><header className="bookingHeader"><Link href="/" className="brand"><img src="/logo.png" alt="Silkcrayon"/></Link><Link href="/">← Back to studio</Link></header><section className="bookingHero"><h1>Book your session.</h1></section><div className="container"><Suspense fallback={<p>Loading booking system…</p>}><BookingModeChooser promotions={promotions} pricing={pricing}/></Suspense><nav className="bookingExtras" aria-label="Other studio options"><a href="/mix-request">Mixing & mastering</a><a href="/gift-studio-time">Gift studio time</a></nav></div></main>;
}

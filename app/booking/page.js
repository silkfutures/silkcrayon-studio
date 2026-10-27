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
  const promotions=(await getLivePromotions()).filter(p=>p.show_on_booking && !String(p.code||" ").toLowerCase().includes("relaunch")).map(publicPromotion);
  const pricing=await getStudioSettings();
  return <main className="bookingPage"><ScrollToTop/><header className="bookingHeader"><Link href="/" className="brand"><img src="/logo.png" alt="Silkcrayon"/></Link><Link href="/">← Back to studio</Link></header><section className="bookingHero"><h1>Book your session.</h1></section><div className="container"><Suspense fallback={<p>Loading booking system…</p>}><BookingFlow promotions={promotions} pricing={pricing}/></Suspense><section className="passPromotion" aria-label="Studio Pass"><div><span>FOR ARTISTS BUILDING SOMETHING</span><h2>More sessions. More momentum.</h2><p>Choose 4–8 prepaid hours with our 30-day Studio Pass. Engineer included, book across several visits.</p></div><a className="button primary" href="/studio-pass">Build your Studio Pass →</a></section><nav className="bookingExtras" aria-label="Other studio options"><a href="/mix-request">Mixing & mastering</a><a href="/buy-hours">Studio hour packs</a><a href="/gift-studio-time">Gift studio time</a></nav></div></main>;
}

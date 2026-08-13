import Link from "next/link";
import { Suspense } from "react";
import BookingFlow from "../../components/BookingFlow";

export const metadata = { title: "Book — Silkcrayon Studios" };
export default function BookingPage() {
  return <main className="bookingPage"><header className="bookingHeader"><Link href="/" className="brand"><img src="/logo.png" alt="Silkcrayon"/></Link><Link href="/">← Back to studio</Link></header><section className="bookingHero"><p className="eyebrow">Book Silkcrayon</p><h1>Choose a session.<br/><span>Leave with progress.</span></h1><p>Live availability, secure payment and your booking stored in one place.</p></section><div className="container"><Suspense fallback={<p>Loading booking system…</p>}><BookingFlow/></Suspense></div></main>;
}

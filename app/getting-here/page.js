import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import Reveal from "../../components/Reveal";

export const metadata={
 title:"Getting to Silkcrayon Studios | Cardiff Bay",
 description:"Directions and arrival information for Silkcrayon Studios at Portland House, Cardiff Bay, including the Bute Street and West Bute Street entrances and parking guidance.",
 alternates:{canonical:"https://silkcrayon.com/getting-here"}
};

export default function GettingHere(){
 return <main className="marketingSite gettingHerePage"><SiteHeader/>
  <section className="ghHero"><div className="container ghHeroGrid">
   <Reveal><div><p className="eyebrow">Getting here</p><h1>Find the lane.<br/><span>We’ll meet you there.</span></h1><p className="lede">Silkcrayon Studios is inside Portland House in Cardiff Bay. Portland House has frontage on both Bute Street and West Bute Street, with a lane running through the middle of the building. <b>The studio entrance is in that lane.</b></p><div className="actions"><a className="button primary" href="https://www.google.com/maps/search/?api=1&query=Portland+House+Cardiff+Bay" target="_blank" rel="noreferrer">Open directions ↗</a><Link className="textLink" href="/booking">Book studio time →</Link></div></div></Reveal>
   <Reveal delay={90}><figure className="ghHeroImage"><img src="/images/getting-here/lane-entrance.webp" alt="Lane entrance leading to Silkcrayon Studios at Portland House Cardiff Bay"/><figcaption>This is the lane you’re looking for.</figcaption></figure></Reveal>
  </div></section>

  <section className="section ghArrival"><div className="container">
   <Reveal><div className="sectionHeading"><div><p className="eyebrow">On arrival</p><h2>Don’t wait at the main Portland House doors.</h2></div><p>Enter the lane between the two sides of Portland House and wait by the studio entrance. Your booking reminder will show your assigned engineer and their contact number. Text your engineer when you arrive and they’ll come out to meet you.</p></div></Reveal>
   <div className="ghSteps"><article><span>01</span><h3>Find Portland House</h3><p>Approach from either Bute Street or West Bute Street.</p></article><article><span>02</span><h3>Enter the lane</h3><p>The lane runs through the middle of Portland House. The Silkcrayon entrance is inside it.</p></article><article><span>03</span><h3>Text your engineer</h3><p>Wait in the lane and message the engineer shown in your session reminder.</p></article></div>
  </div></section>

  <section className="section ghSides"><div className="container"><Reveal><p className="eyebrow">Two ways in</p><h2>Whichever side you approach from,<br/>the lane brings you to us.</h2></Reveal>
   <div className="ghSideGrid">
    <article><div className="ghStreetImage"><img src="/images/getting-here/bute-street.webp" alt="Bute Street side of Portland House and lane entrance"/></div><div><p className="eyebrow">Bute Street side</p><h3>Look for the lane beside Portland House.</h3><p>The entrance is beside the shuttered frontage shown here. Walk into the lane rather than using the main Portland House doors.</p></div></article>
    <article><div className="ghStreetImage"><img src="/images/getting-here/west-bute-street.webp" alt="West Bute Street side of Portland House and lane entrance"/></div><div><p className="eyebrow">West Bute Street side</p><h3>You can enter from this side too.</h3><p>Follow the lane through the middle of Portland House. The studio entrance is inside the lane.</p></div></article>
   </div>
  </div></section>

  <section className="section ghParking"><div className="container ghParkingGrid">
   <Reveal><div><p className="eyebrow">Parking</p><h2>Street parking on both sides.</h2><p>Paid on-street parking is available on Bute Street and West Bute Street. You can pay at the street machines or through the <b>MiPermit</b> app.</p><p><b>Parking is free after 6pm on both streets.</b></p><p className="muted">For daytime sessions, check the machine or MiPermit for the current rate and restrictions when you park.</p></div></Reveal>
   <Reveal delay={90}><aside className="ghArrivalCard"><p className="eyebrow">Your session reminder</p><h3>We’ll send this again the day before.</h3><p>Your reminder includes your session time, assigned engineer, their contact number, arrival instruction and a direct link back to this page.</p><Link href="/account/login" className="button outline">Open My Studio →</Link></aside></Reveal>
  </div></section>
 </main>
}
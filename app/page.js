import Link from "next/link";
import MeetEngineers from "../components/MeetEngineers";
import SiteHeader from "../components/SiteHeader";
import Reveal from "../components/Reveal";
import GoogleReviewProof from "../components/GoogleReviewProof";
import {getLivePromotions,publicPromotion} from "../lib/promotions";
import {getStudioSettings} from "../lib/studioSettings";


export const dynamic="force-dynamic";
export default async function Home(){
  const [livePromotions,pricing]=await Promise.all([getLivePromotions(),getStudioSettings()]);
  const promo=publicPromotion(livePromotions.find(p=>p.show_on_homepage));
  const hourly=`£${(pricing.studioHourlyPricePence/100).toFixed(pricing.studioHourlyPricePence%100?2:0)}`;
  const services=[
    {n:'01',title:'Vocal Recording',copy:'Record singing or rap vocals over your beat or backing track. Charged by the hour, with an engineer, mixing and mastering included during your booked time.',meta:`From ${hourly} / hour`,href:'/booking?service=vocal-recording',featured:true},
    {n:'02',title:'Studio Dry Hire',copy:'Already know what you are doing? Bring your own engineer or run the session yourself. Use the Silkcrayon room, booth, monitoring and studio setup without a Silkcrayon engineer.',meta:'£40 / hour · 2h minimum',href:'/dry-hire-cardiff'},
    {n:'03',title:'Mixing & Mastering',copy:'Professional mix and master from an engineer who has developed artists from first session to release-ready. Your sound, elevated.',meta:'Tailored quote per track',href:'/mix-request',enquire:true},
  ];
  const site=process.env.NEXT_PUBLIC_SITE_URL||'https://www.silkcrayon.com';
  const business={"@context":"https://schema.org","@type":"LocalBusiness","@id":`${site}/#studio`,name:"Silkcrayon Studios",url:site,image:`${site}/images/wide.webp`,description:"Premium vocal recording, mixing and release-ready music production in Cardiff Bay.",priceRange:"££",address:{"@type":"PostalAddress",streetAddress:process.env.STUDIO_STREET_ADDRESS||"113-116 Portland House",addressLocality:process.env.STUDIO_LOCALITY||"Cardiff",postalCode:process.env.STUDIO_POSTCODE||undefined,addressCountry:"GB"},sameAs:["https://instagram.com/silkcrayon",process.env.GOOGLE_BUSINESS_URL].filter(Boolean)};
  return <main className="marketingSite"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(business)}}/>
    <SiteHeader/>
    <section className="hero heroV12">
      <div className="heroShade"/>
      <div className="heroGlow"/>
      <div className="container heroContent">
        <p className="eyebrow heroEyebrow">Cardiff Bay · Est. 2020</p>
        <h1>A Studio For Artists<br/>Who Want To <span>Go Further.</span></h1>
        <p className="lede">Expert vocal recording, release-ready production and genuine creative guidance — inside a hidden 1926 bank vault in Cardiff Bay.</p>
        <div className="actions heroActions"><Link className="button primary magnetic" href="/booking">Book a session <span>↗</span></Link><a className="textLink" href="#services">Explore the studio →</a></div>
        {promo && <p className="homeOffer"><Link href={`/booking?service=${promo.serviceSlug}&duration=${promo.durationMinutes}`}>{promo.badgeText || 'Studio offer'}: {promo.durationMinutes / 60} hours for £{promo.offerPricePence / 100} · {promo.ctaText || 'View offer'} →</Link></p>}
        <div className="heroProof"><span><b>600+</b> artists</span><i/><span><b>6+</b> years developing talent</span><i/><span><b>{hourly}</b> per hour</span></div>
      </div>
      <a className="scrollCue" href="#services"><span>Scroll</span><i/></a>
    </section>

    <section id="services" className="section servicesV12"><div className="container">
      <Reveal><div className="sectionHeading serviceHeading"><div><p className="eyebrow">Services</p><h2>Come in with an idea.<br/>Leave with a record.</h2></div><p>Start with the session you need now. Stay for everything that comes next.</p></div></Reveal>
      <div className="serviceList">{services.map((s,i)=><Reveal key={s.title} delay={i*60}><article className={`serviceRow ${s.featured?'featured':''}`}><span className="serviceNumber">{s.n}</span><div><h3>{s.title}</h3><p>{s.copy}</p></div><div className="serviceMeta"><strong>{s.meta}</strong>{s.href?<Link href={s.href}>{s.enquire?'Enquire →':'Book →'}</Link>:<Link href="/enquire">Enquire →</Link>}</div></article></Reveal>)}</div>
      <div className="serviceCta"><Link className="textLink" href="/services">All services, full days &amp; artist development →</Link><Link className="textLink" href="/request-a-call">Need a hand choosing? Request a call →</Link></div>
    </div></section>

    <section id="work" className="section workV12"><div className="container workGrid">
      <Reveal><div><p className="eyebrow">Made at Silkcrayon</p><h2>Hear the room,<br/>not the sales pitch.</h2><p className="muted">Music recorded and developed through Silkcrayon. Real artists, real sessions, real releases.</p></div></Reveal>
      <Reveal delay={120}><div className="listenStack"><div className="spotifyShell"><iframe style={{borderRadius:'12px'}} src="https://open.spotify.com/embed/playlist/5IuKX22eXsbJFApMV3c74z?utm_source=generator&theme=0" width="100%" height="380" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Recorded at Silkcrayon playlist"></iframe></div><a className="instagramLink" href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer"><span>Follow the studio</span><strong>@silkcrayon ↗</strong></a></div></Reveal>
    </div></section>

    <GoogleReviewProof/>

    <MeetEngineers/>

    <section id="space" className="section spaceV12"><div className="container spaceGrid">
      <Reveal className="spaceVisual"><div className="imageStack"><img className="spaceMain" src="/images/vault.webp" alt="Silkcrayon studio interior"/><img className="spaceDetail" src="/images/neon.webp" alt="Silkcrayon neon wall"/></div></Reveal>
      <Reveal delay={120}><div className="copyBlock"><p className="eyebrow">The Space</p><h2>Hidden in a <span>1926</span><br/>bank vault.</h2><p>Warm light, proper monitoring, a dedicated vocal booth and enough character to make the room feel like somewhere work matters.</p><p>The equipment is important. The atmosphere is what lets you forget about it.</p><div className="spaceFacts"><span>Neumann U87</span><span>Adam monitoring</span><span>Private vocal booth</span><span>Cardiff Bay</span></div><Link className="textLink" href="/getting-here">Find us in Cardiff Bay →</Link></div></Reveal>
    </div></section>

    <section className="section finalCta"><div className="container">
      <Reveal><p className="eyebrow">Your next record starts here</p><h2>Ready when you are.</h2><p>Choose a session, pick a time and come make something worth keeping.</p><Link className="button primary large" href="/booking">Book Silkcrayon <span>↗</span></Link><p className="ctaMicro">{hourly}/hour · Secure online booking · Cardiff Bay</p></Reveal>
    </div></section>

    <footer className="siteFooter"><div className="container footerGrid"><div><img src="/logo.png" alt="Silkcrayon"/><p>Cardiff Bay · Recording & creative development</p></div><div><a href="#services">Services</a><a href="#space">The Space</a><Link href="/booking">Book</Link></div><div><Link href="/buy-hours">Studio hour packs</Link><Link href="/gift-studio-time">Gift studio time</Link><Link href="/young-creators">Young creators</Link><Link href="/account/login">My Studio</Link><Link href="/getting-here">Getting here</Link><Link href="/faq">FAQ</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cancellation-policy">Cancellation & refunds</Link><Link href="/no-harmful-music-policy">No Harmful Music</Link><a href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer">Instagram ↗</a><a href="mailto:info@silkcrayon.com">info@silkcrayon.com</a></div></div></footer>
    <Link href="/booking" className="mobileBookBar">Book a session <span>↗</span></Link>
  </main>
}

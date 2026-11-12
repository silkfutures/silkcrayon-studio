import Link from "next/link";
import styles from "./first-session.module.css";
import SiteFooter from "../components/SiteFooter";
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
        <div className="actions heroActions"><Link className="button primary magnetic" href="/booking">Book a session <span>↗</span></Link><a className="textLink" href="#space">Explore the studio →</a></div>
        {promo && <p className="homeOffer"><Link href={`/booking?service=${promo.serviceSlug}&duration=${promo.durationMinutes}`}>{promo.badgeText || 'Studio offer'}: {promo.durationMinutes / 60} hours for £{promo.offerPricePence / 100} · {promo.ctaText || 'View offer'} →</Link></p>}
        <div className="heroProof"><span><b>600+</b> artists</span><i/><span><b>6+</b> years developing talent</span><i/><span><b>{hourly}</b> per hour</span></div>
      </div>
      <a className="scrollCue" href="#space"><span>Scroll</span><i/></a>
    </section>

    <section id="space" className="section spaceV12"><div className="container spaceGrid">
      <Reveal className="spaceVisual"><div className="imageStack"><img className="spaceMain" src="/images/vault.webp" alt="Silkcrayon studio interior"/><img className="spaceDetail" src="/images/neon.webp" alt="Silkcrayon neon wall"/></div></Reveal>
      <Reveal delay={120}><div className="copyBlock"><p className="eyebrow">The Space</p><h2>Hidden in a <span>1926</span><br/>bank vault.</h2><p>Warm light, proper monitoring, a dedicated vocal booth and enough character to make the room feel like somewhere work matters.</p><p>The equipment is important. The atmosphere is what lets you forget about it.</p><div className="spaceFacts"><span>Neumann U87</span><span>Adam monitoring</span><span>Private vocal booth</span><span>Cardiff Bay</span></div><Link className="textLink" href="/getting-here">Find us in Cardiff Bay →</Link></div></Reveal>
    </div></section>

    <section className="section sessionGallerySection"><div className="container">
      <div className="sectionHeading"><div><p className="eyebrow">Inside the session</p><h2>Ideas become music.</h2></div></div>
      <div className="sessionGallery">
        <img src="/images/sessions/studio-session.jpg" alt="Artists working together at the studio workstation under turquoise lighting" width="1800" height="1200" loading="lazy" decoding="async"/>
        <img className="sessionPortrait" src="/images/sessions/songwriting.jpg" alt="An artist writing in a notebook during a studio session" width="1067" height="1600" loading="lazy" decoding="async"/>
        <img src="/images/sessions/vocal-recording.jpg" alt="An artist wearing headphones recording vocals at a studio microphone" width="1800" height="1200" loading="lazy" decoding="async"/>
      </div>
    </div></section>

    <GoogleReviewProof/>

    <section id="services" className="section servicesV12"><div className="container">
      <Reveal><div className="sectionHeading serviceHeading"><div><p className="eyebrow">Services</p><h2>Come in with an idea.<br/>Leave with a record.</h2></div><p>Start with the session you need now. Stay for everything that comes next.</p></div></Reveal>
      <div className="serviceList">{services.map((s,i)=><Reveal key={s.title} delay={i*60}><article className={`serviceRow ${s.featured?'featured':''}`}><span className="serviceNumber">{s.n}</span><div><h3>{s.title}</h3><p>{s.copy}</p></div><div className="serviceMeta"><strong>{s.meta}</strong>{s.href?<Link href={s.href}>{s.enquire?'Enquire →':'Book →'}</Link>:<Link href="/enquire">Enquire →</Link>}</div></article></Reveal>)}</div>
      <div className="serviceCta"><Link className="textLink" href="/services">All services, full days &amp; artist development →</Link><Link className="textLink" href="/enquire?call=1">Need a hand choosing? Request a call →</Link></div>
    </div></section>

    <section id="first-session" className={`section ${styles.section}`} aria-labelledby="first-session-heading">
      <div className={`container ${styles.grid}`}>
        <div className={styles.intro}>
          <p className="eyebrow">New to the studio?</p>
          <h2 id="first-session-heading">Your first<br/>studio session.</h2>
          <p className={styles.lede}>You don’t need to have done this before. If you’ve been writing songs, recording in your bedroom or wondering what your voice could sound like in a studio, you’re welcome here.</p>
          <img className={styles.photo} src="/images/sessions/vocal-recording.jpg" alt="An artist wearing headphones recording vocals at a studio microphone" width="1800" height="1200" loading="lazy" decoding="async"/>
        </div>
        <div className={styles.details}>
          <div className={styles.answer}><h3>What should I bring?</h3><p>Bring your lyrics, your beat or backing track, and a couple of songs you like the sound of. If you’re still working out your ideas or need help with production, talk to us before booking so we can find the right session for you.</p></div>
          <div className={styles.answer}><h3>What happens when I arrive?</h3><p>We’ll have a chat, listen to what you’re working on and get you comfortable with the setup. Your engineer will guide you through recording, help you work through different takes and listen back with you.</p></div>
          <div className={styles.answer}><h3>Do I need to get it right first time?</h3><p>No. There’s room to try things, make mistakes and go again. You don’t have to arrive sounding like a finished record.</p></div>
          <div className={styles.answer}><h3>What will I leave with?</h3><p>That depends on what we’re making and how much time we have. Your vocal recording booking covers recording, mixing and mastering within the session time. We’ll help you set a realistic aim for the session and explain if your track needs more work before release.</p></div>
          <div className={styles.cta}><h3>Not sure where to start?</h3><p>Tell us a little about your music. We’ll help you work out what to book.</p><div className={styles.actions}><Link className="button primary" href="/enquire?call=1">Talk to us <span aria-hidden="true">↗</span></Link><Link className="textLink" href="/booking?service=vocal-recording">Book a session →</Link></div></div>
        </div>
      </div>
    </section>

    <MeetEngineers/>

    <section id="work" className="section workV12"><div className="container workGrid">
      <Reveal><div><p className="eyebrow">Made at Silkcrayon</p><h2>Hear the room,<br/>not the sales pitch.</h2><p className="muted">Music recorded and developed through Silkcrayon. Real artists, real sessions, real releases.</p></div></Reveal>
      <Reveal delay={120}><div className="listenStack"><div className="spotifyShell"><iframe style={{borderRadius:'12px'}} src="https://open.spotify.com/embed/playlist/5IuKX22eXsbJFApMV3c74z?utm_source=generator&theme=0" width="100%" height="380" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Recorded at Silkcrayon playlist"></iframe></div><a className="instagramLink" href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer"><span>Follow the studio</span><strong>@silkcrayon ↗</strong></a></div></Reveal>
    </div></section>

    <section className="section"><div className="container spaceGrid"><div><img src="/images/wide2.webp" alt="The shared creative space at Silkcrayon Studios" loading="lazy" width="1920" height="1280" style={{width:'100%',height:'auto'}}/></div><div className="copyBlock"><p className="eyebrow">Community · Since 2020</p><h2>Find your people.<br/>Make your next thing.</h2><p>Since 2020, Silkcrayon has been a community hub connecting artists, producers and creative minds. We’re making more space for those connections through small-group studio collaborations and monthly producer meetups.</p><Link className="button primary" href="/community">Explore the community <span>↗</span></Link></div></div></section>

    <section className="section finalCta"><div className="container">
      <Reveal><p className="eyebrow">Your next record starts here</p><h2>Ready when you are.</h2><p>Choose a session, pick a time and come make something worth keeping.</p><Link className="button primary large" href="/booking">Book Silkcrayon <span>↗</span></Link><p className="ctaMicro">{hourly}/hour · Secure online booking · Cardiff Bay</p></Reveal>
    </div></section>

    <SiteFooter/>
    <Link href="/booking" className="mobileBookBar">Book a session <span>↗</span></Link>
  </main>
}

import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import Reveal from "../components/Reveal";
import EmailSignup from "../components/EmailSignup";

const services=[
  {n:'01',title:'Vocal Recording',copy:'Record through a Neumann U87 with engineers who understand performance, doubles, harmonies, layers and the details that make a vocal feel finished.',meta:'From £60 / hour',href:'/booking?service=vocal-recording',featured:true},
  {n:'02',title:'Mixing & Mastering',copy:'Professional mix and master from an engineer who has developed artists from first session to release-ready. Your sound, elevated.',meta:'POA per track',href:'/enquire?type=mixing',enquire:true},
  {n:'03',title:'Audiobooks & Podcasts',copy:'Crystal-clear recording, editing and production for spoken-word projects in a calm, focused space.',meta:'POA per project',href:'/enquire?type=audiobook-podcast',enquire:true},
  {n:'04',title:'Full Day',copy:'Eight hours in the vault for focused recording, writing, development and production without watching the clock.',meta:'£450 / day',href:'/booking?service=full-day'}
];

const differences=[
  {title:'Vocal takes that feel finished',copy:'We coach takes, comp performances and build doubles, harmonies and layers with care — not just press record.',img:'/images/booth.webp'},
  {title:'Leave with something usable',copy:'We mix as we go and work toward a release-ready result while you are in the room. Momentum matters.',img:'/images/workstation.webp'},
  {title:'Your music stays safe',copy:'Session files are kept organised and backed up so your work does not disappear when the session ends.',img:'/images/doorway.webp'},
  {title:'A studio you can grow with',copy:'From your first serious session to release strategy and artistic direction, you have people around you who understand the journey.',img:'/images/wide.webp'}
];

export default function Home(){
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
        <div className="actions heroActions"><Link className="button primary magnetic" href="/booking">Book a session <span>↗</span></Link><a className="textLink" href="#experience">See why artists stay →</a></div>
        <div className="heroProof"><span><b>600+</b> artists</span><i/><span><b>6+</b> years developing talent</span><i/><span><b>£60</b> per hour</span></div>
      </div>
      <a className="scrollCue" href="#experience"><span>Scroll</span><i/></a>
    </section>

    <section id="experience" className="section sectionTight proofStrip"><div className="container proofGrid">
      <Reveal><p className="eyebrow">Not just studio hire</p><h2>You should leave better than you arrived.</h2></Reveal>
      <Reveal delay={100}><p className="proofCopy">A great studio session is not just a good mic and a clean recording. It is feeling understood, getting the take you actually meant, hearing the record come alive in the room and knowing what to do next.</p></Reveal>
    </div></section>

    <section className="section experienceSection"><div className="container">
      <Reveal><div className="sectionHeading"><div><p className="eyebrow">The Silkcrayon difference</p><h2>Built around the artist.</h2></div><p>Four things we obsess over because they are what make artists come back.</p></div></Reveal>
      <div className="experienceGrid">{differences.map((d,i)=><Reveal key={d.title} delay={i*80}><article className="experienceCard"><div className="experienceImage"><img src={d.img} alt={`${d.title} at Silkcrayon Studios Cardiff`}/><span>0{i+1}</span></div><h3>{d.title}</h3><p>{d.copy}</p></article></Reveal>)}</div>
    </div></section>

    <section id="services" className="section servicesV12"><div className="container">
      <Reveal><div className="sectionHeading serviceHeading"><div><p className="eyebrow">Services</p><h2>Come in with an idea.<br/>Leave with a record.</h2></div><p>Start with the session you need now. Stay for everything that comes next.</p></div></Reveal>
      <div className="serviceList">{services.map((s,i)=><Reveal key={s.title} delay={i*60}><article className={`serviceRow ${s.featured?'featured':''}`}><span className="serviceNumber">{s.n}</span><div><h3>{s.title}</h3><p>{s.copy}</p></div><div className="serviceMeta"><strong>{s.meta}</strong>{s.href?<Link href={s.href}>{s.enquire?'Enquire →':'Book →'}</Link>:<Link href="/enquire">Enquire →</Link>}</div></article></Reveal>)}</div>
      <Reveal><div className="callCta"><div><span>NOT SURE WHAT YOU NEED?</span><h3>Talk it through with us.</h3><p>Tell us about the project and we’ll give you a call.</p></div><Link className="softPill" href="/request-a-call">Request a call <span>↗</span></Link></div></Reveal><Reveal><div className="serviceCta"><div><span>Not sure what to book?</span><p>Most artists start with a vocal recording session.</p></div><Link className="softPill" href="/booking?service=vocal-recording">Start here <span>↗</span></Link></div></Reveal>
    </div></section>

    <section className="section sessionJourney"><div className="container">
      <Reveal><p className="eyebrow">Your session</p><h2>Simple from booking to bounce.</h2></Reveal>
      <div className="journeyGrid">
        <Reveal><article><span>01</span><h3>Book your time</h3><p>Pick a date, duration and pay securely online. Your confirmation lands instantly.</p></article></Reveal>
        <Reveal delay={90}><article><span>02</span><h3>Tell us the goal</h3><p>Your engineer knows what you are making before you arrive, so the session starts with direction.</p></article></Reveal>
        <Reveal delay={180}><article><span>03</span><h3>Create properly</h3><p>Record, refine, layer, mix and make decisions while the energy is still in the room.</p></article></Reveal>
        <Reveal delay={270}><article><span>04</span><h3>Keep building</h3><p>Your files stay safe, your history stays with us and your next session starts where the last one ended.</p></article></Reveal>
      </div>
    </div></section>

    <section id="space" className="section spaceV12"><div className="container spaceGrid">
      <Reveal className="spaceVisual"><div className="imageStack"><img className="spaceMain" src="/images/vault.webp" alt="Silkcrayon studio interior"/><img className="spaceDetail" src="/images/neon.webp" alt="Silkcrayon neon wall"/></div></Reveal>
      <Reveal delay={120}><div className="copyBlock"><p className="eyebrow">The Space</p><h2>Hidden in a <span>1926</span><br/>bank vault.</h2><p>Warm light, proper monitoring, a dedicated vocal booth and enough character to make the room feel like somewhere work matters.</p><p>The equipment is important. The atmosphere is what lets you forget about it.</p><div className="spaceFacts"><span>Neumann U87</span><span>Adam monitoring</span><span>Private vocal booth</span><span>Cardiff Bay</span></div><Link className="textLink" href="/booking">Book the vault →</Link></div></Reveal>
    </div></section>

    <section id="work" className="section workV12"><div className="container workGrid">
      <Reveal><div><p className="eyebrow">Made at Silkcrayon</p><h2>Hear the room,<br/>not the sales pitch.</h2><p className="muted">Music recorded and developed through Silkcrayon. Real artists, real sessions, real releases.</p></div></Reveal>
      <Reveal delay={120}><div className="listenStack"><div className="spotifyShell"><iframe style={{borderRadius:'12px'}} src="https://open.spotify.com/embed/playlist/5IuKX22eXsbJFApMV3c74z?utm_source=generator&theme=0" width="100%" height="380" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Recorded at Silkcrayon playlist"></iframe></div><a className="instagramLink" href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer"><span>Follow the studio</span><strong>@silkcrayon ↗</strong></a></div></Reveal>
    </div></section>

    <section className="section standardV12"><div className="container standardGrid">
      <Reveal><div><p className="eyebrow">The standard</p><h2>Music that moves<br/>people forward.</h2><p>We care about what gets made here. Silkcrayon is a positive creative environment and every booking includes agreement to our No Harmful Music Policy.</p></div></Reveal>
      <Reveal delay={120}><div className="standardPoints"><p>Authenticity over posturing.</p><p>Craft over shortcuts.</p><p>Respect for the room and the people in it.</p><p>Work you can be proud to put your name on.</p></div></Reveal>
    </div></section>

    <section className="section newsletterSection"><div className="container"><EmailSignup/></div></section>
    <section className="section finalCta"><div className="container">
      <Reveal><p className="eyebrow">Your next record starts here</p><h2>Ready when you are.</h2><p>Choose a session, pick a time and come make something worth keeping.</p><Link className="button primary large" href="/booking">Book Silkcrayon <span>↗</span></Link><p className="ctaMicro">From £60/hour · Secure online booking · Cardiff Bay</p></Reveal>
    </div></section>



    <footer className="siteFooter"><div className="container footerGrid"><div><img src="/logo.png" alt="Silkcrayon"/><p>Cardiff Bay · Recording & creative development</p></div><div><a href="#services">Services</a><a href="#space">The Space</a><Link href="/booking">Book</Link></div><div><Link href="/account/login">My Studio</Link><Link href="/faq">FAQ</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cancellation-policy">Cancellation & refunds</Link><Link href="/no-harmful-music-policy">No Harmful Music</Link><a href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer">Instagram ↗</a><a href="mailto:info@silkcrayon.com">info@silkcrayon.com</a></div></div></footer>
    <Link href="/booking" className="mobileBookBar">Book a session <span>↗</span></Link>
  </main>
}

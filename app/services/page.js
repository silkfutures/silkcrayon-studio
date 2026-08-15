import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import Reveal from "../../components/Reveal";

export const metadata={
 title:"Recording Studio Services Cardiff",
 description:"Vocal recording, mixing and mastering, music production, audiobook and podcast recording, and bespoke production at Silkcrayon Studios in Cardiff.",
 alternates:{canonical:"https://silkcrayon.com/services"},
 openGraph:{title:"Recording Studio Services Cardiff | Silkcrayon Studios",description:"Recording, mixing, production and spoken-word studio services in Cardiff.",url:"https://silkcrayon.com/services",type:"website"}
};

const services=[
 {n:"01",title:"Vocal Recording",copy:"Record through a Neumann U87 with an engineer who understands performance, doubles, harmonies, layers and the details that make a vocal feel finished.",meta:"From £60 / hour",href:"/booking?service=vocal-recording",cta:"Book →"},
 {n:"02",title:"Mixing & Mastering",copy:"Take the record beyond the session with focused clean-up, balance, detail and a release-ready finish.",meta:"Studio Finish · £60",href:"/enquire?type=mixing",cta:"Enquire →"},
 {n:"03",title:"Music Production",copy:"Develop the idea, arrangement and sound around the artist. From an early concept through to a complete record.",meta:"Project based",href:"/enquire?type=production",cta:"Enquire →"},
 {n:"04",title:"Audiobooks & Podcasts",copy:"Clear, controlled spoken-word recording in a calm professional environment, with engineering and production support available.",meta:"Project based",href:"/enquire?type=audiobook-podcast",cta:"Enquire →"},
 {n:"05",title:"Bespoke Production",copy:"For creative work that does not fit a standard session. Tell us what you are making and we will shape the right studio approach around it.",meta:"Built around the project",href:"/enquire?type=bespoke-production",cta:"Enquire →"}
];

export default function Services(){
 return <main className="marketingSite servicesPage">
  <SiteHeader/>
  <section className="servicesHero">
   <div className="container servicesHeroGrid">
    <Reveal><div className="servicesHeroCopy"><p className="eyebrow">Silkcrayon Studios · Cardiff Bay</p><h1>Everything your work needs.<br/><span>Under one roof.</span></h1><p className="lede">Start with a recording session. Stay for the production, finish and creative support that gets the work where you want it to go.</p><div className="actions"><Link className="button primary magnetic" href="/booking">Book a session <span>↗</span></Link><Link className="textLink" href="/request-a-call">Talk it through →</Link></div></div></Reveal>
    <Reveal delay={100}><div className="servicesHeroImage"><img src="/images/wide.webp" alt="Silkcrayon recording studio in Cardiff Bay"/><div className="servicesHeroBadge"><b>Cardiff Bay</b><span>Recording · Production · Finish</span></div></div></Reveal>
   </div>
  </section>

  <section className="section servicesV12 servicesDirectory"><div className="container">
   <Reveal><div className="sectionHeading serviceHeading"><div><p className="eyebrow">Services</p><h2>Choose the part<br/>you need now.</h2></div><p>You do not need to know the whole journey before you start. Pick the closest fit and we’ll help with the rest.</p></div></Reveal>
   <div className="serviceList">{services.map((s,i)=><Reveal key={s.title} delay={i*55}><article className={`serviceRow ${i===0?"featured":""}`}><span className="serviceNumber">{s.n}</span><div><h3>{s.title}</h3><p>{s.copy}</p></div><div className="serviceMeta"><strong>{s.meta}</strong><Link href={s.href}>{s.cta}</Link></div></article></Reveal>)}</div>
  </div></section>

  <section className="section servicesStory"><div className="container servicesStoryGrid">
   <Reveal><div className="servicesStoryImage"><img src="/images/booth.webp" alt="Private vocal booth at Silkcrayon Studios Cardiff"/></div></Reveal>
   <Reveal delay={100}><div className="copyBlock"><p className="eyebrow">Not sure what you need?</p><h2>Tell us what you’re making.</h2><p>We would rather point you towards the right session than sell you the wrong one. Send the project over or request a call and we’ll help you choose.</p><div className="actions"><Link className="button primary" href="/enquire">Make an enquiry <span>↗</span></Link><Link className="textLink" href="/request-a-call">Request a call →</Link></div></div></Reveal>
  </div></section>

  <section className="section serviceExtras"><div className="container"><div className="sectionHeading"><div><p className="eyebrow">More ways to use the studio</p><h2>Time that fits around you.</h2></div></div><div className="serviceExtraGrid"><Link href="/buy-hours"><b>Buy studio hours</b><span>Pay now. Choose the date later →</span></Link><Link href="/gift-studio-time"><b>Gift studio time</b><span>Choose 1–8 hours →</span></Link><Link href="/young-creators"><b>For young creators</b><span>Creative space, confidence and craft →</span></Link></div></div></section><section className="section finalCta"><div className="container"><Reveal><p className="eyebrow">Your next record starts here</p><h2>Ready when you are.</h2><p>Choose a session, pick a time and come make something worth keeping.</p><Link className="button primary large" href="/booking">Book Silkcrayon <span>↗</span></Link><p className="ctaMicro">From £60/hour · Secure online booking · Cardiff Bay</p></Reveal></div></section>

  <footer className="siteFooter"><div className="container footerGrid"><div><img src="/logo.png" alt="Silkcrayon"/><p>Cardiff Bay · Recording & creative development</p></div><div><Link href="/services">Services</Link><Link href="/#space">The Space</Link><Link href="/booking">Book</Link></div><div><Link href="/account/login">My Studio</Link><Link href="/faq">FAQ</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cancellation-policy">Cancellation & refunds</Link><Link href="/no-harmful-music-policy">No Harmful Music</Link><a href="https://instagram.com/silkcrayon" target="_blank" rel="noreferrer">Instagram ↗</a><a href="mailto:info@silkcrayon.com">info@silkcrayon.com</a></div></div></footer>
  <Link href="/booking" className="mobileBookBar">Book a session <span>↗</span></Link>
 </main>
}
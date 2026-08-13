import Link from "next/link";

export default function Home() {
  return (
    <main>
      <header className="siteHeader">
        <Link href="/" className="brand"><img src="/logo.png" alt="Silkcrayon" /></Link>
        <nav><a href="#space">The space</a><a href="#services">Services</a><a href="#difference">Why Silkcrayon</a><Link className="navCta" href="/booking">Book</Link></nav>
      </header>

      <section className="hero">
        <div className="heroShade" />
        <div className="container heroContent">
          <p className="eyebrow">Cardiff Bay · EST. 2020</p>
          <h1>A Local Studio<br/>With A <span>Worldwide</span><br/>Sound.</h1>
          <p className="lede">Experts in vocal recording, artist development and release-ready production. Built for artists who want somewhere to grow with.</p>
          <div className="actions"><Link className="button primary" href="/booking">Book a session</Link><a className="textLink" href="#space">Explore the studio →</a></div>
        </div>
      </section>

      <section id="space" className="section">
        <div className="container twoCol">
          <img className="featureImage" src="/images/vault.webp" alt="Silkcrayon studio interior" />
          <div className="copyBlock">
            <p className="eyebrow">The space</p>
            <h2>Hidden in a <span>1926</span><br/>Bank Vault.</h2>
            <p>Silkcrayon has been developed around one question: what does an artist actually need to do their best work?</p>
            <p>The answer isn’t just equipment. It’s environment, energy and someone in the room who genuinely understands where you’re trying to go.</p>
            <p className="accentText">We’re for the artist.</p>
            <div className="stats"><div><b>600+</b><small>artists since 2020</small></div><div><b>6+</b><small>years developing talent</small></div><div><b>£60</b><small>per hour</small></div></div>
          </div>
        </div>
      </section>

      <section id="services" className="section">
        <div className="container">
          <p className="eyebrow">Services</p><h2>Everything you need to create.</h2><p className="muted">From first recording to final master, all under one roof.</p>
          <div className="featureCard"><div><span className="chip">Featured</span><h3>Vocal Recording</h3><p>Record through a Neumann U87 with engineers who understand performance, doubles, harmonies, layers and the details that make a vocal feel finished.</p><strong>From £60 / hour</strong></div><Link href="/booking?service=vocal-recording">Book now →</Link></div>
          <div className="cardGrid">
            <article><h3>Mixing & Mastering</h3><p>Professional mix and master from an engineer who has developed artists from first session to release-ready.</p><strong>POA per track</strong></article>
            <article><h3>Audiobooks & Podcasts</h3><p>Crystal-clear recording, editing and production for spoken-word projects.</p><strong>POA per project</strong></article>
            <article><h3>Industry Guidance</h3><p>Experienced ears, honest feedback and artist-development thinking built into the relationship as you grow.</p><strong>Available to returning artists</strong></article>
            <article><h3>Full Day Rate</h3><p>Eight hours in the vault for focused recording, development and production.</p><Link href="/booking?service=full-day">£450 / day →</Link></article>
          </div>
        </div>
      </section>

      <section id="difference" className="section">
        <div className="container differenceLayout">
          <div className="differenceLead"><p className="eyebrow">The Silkcrayon difference</p><h2>A studio built for artists to <span>grow with.</span></h2><p>We’re more than a studio. We’re a creative partner in your journey — from your first idea to your next release and beyond.</p><Link className="button outline" href="/booking">Book a session →</Link></div>
          <div className="differenceGrid">
            <article><img src="/images/doorway.webp" alt="Studio doorway"/><h3>Never Lose Your Music</h3><p>We keep your session files safe and organised, so your ideas, vocals and mixes don’t disappear when the session ends.</p></article>
            <article><img src="/images/workstation.webp" alt="Studio workstation"/><h3>Mix & Master In Session</h3><p>We work toward the finish line while you’re in the room. The aim is that you leave with something you can genuinely release.</p></article>
            <article><img src="/images/wide.webp" alt="Studio interior"/><h3>Artist Development & Guidance</h3><p>Song structure, artistic identity, strategy and industry guidance for artists building a career rather than just making a record.</p></article>
            <article><img src="/images/booth.webp" alt="Vocal booth"/><h3>Vocal Experts</h3><p>Takes, doubles, harmonies and layers — recorded, comped and shaped with care to get the best out of every performance.</p></article>
          </div>
        </div>
      </section>

      <section id="standard" className="section standard"><div className="container"><p className="eyebrow">The standard</p><h2>Music that moves people forward.</h2><p className="muted">We do not record music that glorifies violence, exploitation or the degradation of others. We believe authenticity is the most powerful artistic force, and we ask every artist to respect the space and the people in it.</p></div></section>

      <section className="section selectedWork"><div className="container"><p className="eyebrow">Selected work</p><h2>Hear what’s been made here.</h2><p className="muted">Drop your Spotify playlist embed into this section when ready.</p></div></section>

      <section className="section cta"><div className="container"><p className="eyebrow">Ready?</p><h2>Book the studio.</h2><p>No Wix hand-off. Choose your session, pick a time and pay securely.</p><Link className="button primary" href="/booking">Start booking</Link></div></section>
      <footer><div className="container footerInner"><img src="/logo.png" alt="Silkcrayon"/><span>Cardiff Bay</span></div></footer>
    </main>
  );
}

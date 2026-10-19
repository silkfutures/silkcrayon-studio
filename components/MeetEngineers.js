import Link from 'next/link';
import styles from './MeetEngineers.module.css';

const testimonials = [
  { name: 'Rhys Hurd', quote: "I have worked with Billy on a couple different projects now, he's an absolute pleasure to work with who's always very reliable, sets up quickly, is good at communicating ideas and gives a great end product. Highly recommend" },
  { name: 'Hex Poseur', quote: 'Brill at mastering and gets tracks back super quickly! Everything sounds really high quality as well, and he is super polite!' },
  { name: 'Orchid Symmetry', quote: 'If you get chance to work with Billy then definitely do it. Very talented guy, that listens and helps you achieve what you want. Would highly recommend' },
];

export default function MeetEngineers() {
  return <section id="engineers" className={`section ${styles.section}`} aria-labelledby="engineers-heading">
    <div className="container">
      <div className="sectionHeading">
        <div><p className="eyebrow">The people behind the sound</p><h2 id="engineers-heading">Meet the engineers.</h2></div>
        <p>Different backgrounds. A shared care for the music. Get to know the people on the other side of the glass.</p>
      </div>
      <div className={styles.profiles}>
        <article className={styles.profile} aria-labelledby="nathan-name">
          <div className={styles.portrait}><img src="/images/staff/nathan.webp" alt="Nathan Misra, founder and engineer at Silkcrayon" width="900" height="954" loading="lazy"/><span>01 / Nathan</span></div>
          <div className={styles.bio}>
            <p className="eyebrow">Founder · Engineer · Artist development</p>
            <h3 id="nathan-name">Nathan Misra</h3>
            <p className={styles.statement}>Pop · R&amp;B · Hip-hop · Rap</p>
            <p>Nathan brings an artist’s perspective to the studio. After seven years pursuing music in London and time working alongside engineer Harry Chaplin in Los Angeles, he built Silkcrayon into a creative home for artists in Cardiff Bay.</p>
            <p>With a focus on pop, R&amp;B, hip-hop and rap, his work brings together vocal recording, production and creative direction, helping artists shape their sound, build confidence and take a song from an idea to a finished record.</p>
            <ul className={styles.tags} aria-label="Nathan’s focus"><li>Vocal recording</li><li>Production</li><li>Artist development</li></ul>
            <Link className="textLink" href="/artist-development">Explore Nathan’s approach →</Link>
          </div>
        </article>
        <article className={styles.profile} aria-labelledby="billy-name">
          <div className={styles.portrait}><img src="/images/staff/billy-tucker.jpg" alt="Billy Tucker working at a studio mixing console" width="449" height="445" loading="lazy"/><span>02 / Billy</span></div>
          <div className={styles.bio}>
            <p className="eyebrow">Audio engineer · Producer</p>
            <h3 id="billy-name">Billy Tucker</h3>
            <p className={styles.statement}>Indie · Pop · Rock · Folk · Neo-soul</p>
            <p>Based in Cardiff, Billy studied Creative Music Technology at Falmouth University and has been recording and producing music since 2016.</p>
            <p>Billy works with artists across indie, pop, rock, folk and neo-soul. His experience also spans noise rock, post-punk and punk rock, alongside hip-hop, drum and bass and psychedelic rock.</p>
            <p>Capturing a live essence comes first. His productions leave room for rough edges, flaws and character, favouring the feeling of a performance over perfection in every tiny detail. He’s happy to work across genres when the creative visions align.</p>
            <ul className={styles.tags} aria-label="Billy’s focus"><li>Recording &amp; production</li><li>Mixing &amp; mastering</li></ul>
            <Link className="textLink" href="/enquire">Talk to us about working with Billy →</Link>
          </div>
        </article>
      </div>
      <div className={styles.testimonials}>
        <p className="eyebrow">Artists on working with Billy</p>
        <div className={styles.quotes}>{testimonials.map(({name, quote}) => <figure key={name}><blockquote>“{quote}”</blockquote><figcaption>{name}</figcaption></figure>)}</div>
      </div>
      <div className={styles.cta}><div><h3>Who’s right for your record?</h3><p>Tell us what you’re making. We’ll help you find the right fit.</p></div><Link className="button primary" href="/booking">Book a session ↗</Link></div>
    </div>
  </section>;
}

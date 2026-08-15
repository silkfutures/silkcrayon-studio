import Link from 'next/link';

export const metadata = {
  title: 'Recording Studio Services Cardiff | Silkcrayon Studios',
  description: 'Professional vocal recording, mixing, mastering, music production, audiobook and podcast recording, and bespoke production at Silkcrayon Studios in Cardiff.',
  alternates: { canonical: 'https://silkcrayon.com/services' },
  openGraph: {
    title: 'Recording Studio Services Cardiff | Silkcrayon Studios',
    description: 'Vocal recording, mixing, mastering, production, audiobooks, podcasts and bespoke studio work in Cardiff.',
    url: 'https://silkcrayon.com/services',
    type: 'website'
  }
};

const services = [
  {
    n:'01',
    title:'Vocal Recording',
    text:'Record in a focused professional environment built around vocals. Work with an engineer, capture your best performance and leave with a session that is ready for the next stage.',
    cta:'Book studio time',
    href:'/booking'
  },
  {
    n:'02',
    title:'Studio Finish',
    text:'Take the record from session to finished release with mixing and mastering designed to give the vocal, production and overall record clarity, impact and balance.',
    cta:'Enquire about your record',
    href:'/enquire'
  },
  {
    n:'03',
    title:'Music Production',
    text:'Develop an idea into a complete record with hands-on creative production. From direction and arrangement to building the sound around the artist.',
    cta:'Start a project',
    href:'/enquire'
  },
  {
    n:'04',
    title:'Audiobooks & Podcasts',
    text:'Clean, controlled voice recording for spoken-word projects, podcasts and audiobooks, with an experienced engineer and a professional recording chain.',
    cta:'Enquire about spoken word',
    href:'/enquire'
  },
  {
    n:'05',
    title:'Bespoke Production',
    text:'For projects that do not fit a standard studio booking. Tell us what you are making and we will shape the right production approach around it.',
    cta:'Tell us about the project',
    href:'/enquire'
  }
];

export default function ServicesPage(){
  return (
    <main className="svc">
      <section className="hero">
        <div className="eyebrow">SILKCRAYON STUDIOS · CARDIFF</div>
        <h1>Services built around the work.</h1>
        <p className="lead">From the first vocal take to the finished record — recording, production and specialist studio services in Cardiff.</p>
        <div className="actions">
          <Link className="primary" href="/booking">Book studio time →</Link>
          <Link className="secondary" href="/contact">Talk to us</Link>
        </div>
      </section>

      <section className="grid" aria-label="Studio services">
        {services.map((s)=>(
          <article className="card" key={s.n}>
            <span className="num">{s.n}</span>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
            <Link href={s.href}>{s.cta} →</Link>
          </article>
        ))}
      </section>

      <section className="finish">
        <div>
          <div className="eyebrow">NOT SURE WHAT TO BOOK?</div>
          <h2>Tell us what you’re making.</h2>
          <p>We’ll point you towards the right session or service rather than making you guess.</p>
        </div>
        <Link className="primary" href="/enquire">Make an enquiry →</Link>
      </section>

      <style>{`
        .svc{max-width:1280px;margin:0 auto;padding:150px 42px 100px;color:#f7f4f8}
        .hero{max-width:900px;padding:40px 0 82px}
        .eyebrow{font-size:13px;letter-spacing:.25em;color:#c18cff;margin-bottom:24px}
        h1{font-size:clamp(48px,7vw,96px);line-height:.94;letter-spacing:-.055em;margin:0 0 30px;max-width:900px}
        .lead{font-size:clamp(20px,2.2vw,29px);line-height:1.45;color:#b9b2bd;max-width:780px;margin:0}
        .actions{display:flex;gap:14px;flex-wrap:wrap;margin-top:38px}
        .primary,.secondary{display:inline-block;padding:17px 22px;text-decoration:none;font-weight:700}
        .primary{background:#bd83f7;color:#09070b}
        .secondary{border:1px solid #514657;color:#f7f4f8}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid #3a323e;border-left:1px solid #3a323e}
        .card{min-height:340px;padding:38px;border-right:1px solid #3a323e;border-bottom:1px solid #3a323e;background:#0d0a10}
        .card:nth-child(2),.card:nth-child(5){background:#130c19}
        .num{color:#bd83f7;font-size:14px}
        .card h2{font-size:clamp(30px,3vw,48px);letter-spacing:-.035em;margin:42px 0 18px}
        .card p{color:#aaa2ae;line-height:1.65;font-size:17px;max-width:500px;margin-bottom:36px}
        .card a{color:#cf9cff;text-decoration:none;font-weight:650}
        .finish{margin-top:70px;padding:55px 0;border-top:1px solid #3a323e;border-bottom:1px solid #3a323e;display:flex;justify-content:space-between;align-items:end;gap:30px}
        .finish h2{font-size:clamp(36px,5vw,66px);letter-spacing:-.04em;margin:0 0 15px}
        .finish p{color:#aaa2ae;font-size:18px;margin:0}
        @media(max-width:760px){
          .svc{padding:105px 22px 70px}
          .hero{padding:30px 0 55px}
          .grid{grid-template-columns:1fr}
          .card{min-height:0;padding:30px 25px}
          .card h2{margin-top:28px}
          .finish{align-items:flex-start;flex-direction:column}
        }
      `}</style>
    </main>
  );
}

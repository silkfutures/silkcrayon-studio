import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import Reveal from "../../components/Reveal";

export const metadata={
  title:"Studio Time for Young Creators | Silkcrayon Cardiff",
  description:"Professional recording studio time for young creators in Cardiff, shaped by five years of youth-development work through Silkfutures.",
  alternates:{canonical:"https://silkcrayon.com/young-creators"}
};

const values=[
  ["01","A voice of their own","Writing and recording turns thoughts, imagination and lived experience into something they can hear, shape and own."],
  ["02","Confidence through doing","A finished verse, a stronger take or learning the desk creates evidence of progress — not just encouragement."],
  ["03","Creative discipline","Music asks for patience, repetition, listening, decision-making and the courage to finish what you start."],
  ["04","Professional standards","Young people use the same creative environment and professional tools as working artists. The standard tells them their ideas matter."]
];

const pathway=[
  ["RESET","Find steadiness","A safe creative environment gives a young person room to arrive, settle and be present."],
  ["REFRAME","See possibility","Making something new can change the story a young person tells themselves about what they can do."],
  ["REBUILD","Practise the craft","Writing, recording, producing and listening back turn intention into repeatable skills."],
  ["RELEASE","Develop a voice","Creative choices become more intentional, reflective and genuinely their own."],
  ["RISE","Lead & contribute","Silkfutures' strongest progression is young people becoming mentors, facilitators and examples for others."]
];

export default function YoungCreators(){
 return <main className="marketingSite youthPage">
  <SiteHeader/>

  <section className="ycHero">
   <div className="container ycHeroGrid">
    <Reveal><div className="ycHeroCopy">
     <p className="eyebrow">Young creators · Parents & carers</p>
     <h1>Give them more than <span>studio time.</span></h1>
     <p className="ycHeroLead">Give them somewhere to turn an idea into something real — to write, record, learn, listen back and discover what they are capable of.</p>
     <div className="actions"><Link className="button primary large" href="/gift-studio-time">Gift studio time <span>↗</span></Link><Link className="textLink" href="/request-a-call">Talk to us first →</Link></div>
    </div></Reveal>
    <Reveal delay={100}><div className="ycHeroVisual"><img src="/images/booth.webp" alt="Professional vocal recording booth at Silkcrayon Studios Cardiff"/><div className="ycHeroStamp"><b>Professional space.</b><span>Real creative ownership.</span></div></div></Reveal>
   </div>
  </section>

  <section className="ycStatement">
   <div className="container">
    <Reveal><p className="ycKicker">WHY IT MATTERS</p><h2>Young people spend all day consuming culture.<br/><span>What happens when they get to create it?</span></h2></Reveal>
   </div>
  </section>

  <section className="section ycValue">
   <div className="container">
    <Reveal><div className="ycIntro"><p className="eyebrow">The value of making</p><h2>Creativity gives growth somewhere to happen.</h2><p>Silkcrayon grew into more than a commercial recording studio because we kept seeing what happened when young people were given serious creative space. Music could open a door to confidence, self-expression, craft, consistency and trusted relationships.</p></div></Reveal>
    <div className="ycValueGrid">{values.map(([n,t,d])=><Reveal key={n}><article><span>{n}</span><h3>{t}</h3><p>{d}</p></article></Reveal>)}</div>
   </div>
  </section>

  <section className="section ycProof">
   <div className="container">
    <Reveal><div className="ycProofHead"><div><p className="eyebrow">Built from real youth work</p><h2>This isn't a marketing theory.</h2></div><p>Silkfutures is the youth-development organisation that grew from Silkcrayon. It uses music, mentoring and movement with young people aged 11–25 in Cardiff. The commercial studio remains part of the creative infrastructure behind that work.</p></div></Reveal>
    <div className="ycStats">
      <div><b>133</b><span>young people supported</span></div>
      <div><b>474</b><span>session attendances</span></div>
      <div><b>349</b><span>hours of mentoring</span></div>
      <div><b>5</b><span>alumni facilitators</span></div>
    </div>
    <Reveal><div className="ycProofSplit">
      <div className="ycProofImage"><img src="/images/workstation.webp" alt="Professional music production workstation at Silkcrayon Studios"/></div>
      <div className="ycProofCopy"><p className="eyebrow">Participant → practitioner</p><h3>The outcome isn't dependence. It's capability.</h3><p>Five former Silkfutures participants are now paid freelance facilitators. Young people who once came in for support now help create the environment for the next person.</p><p>That progression — from being supported, to developing skills, to contributing and leading — is the clearest expression of what the wider Silkcrayon/Silkfutures ecosystem is built to do.</p><a className="textLink" href="https://www.silkfutures.com" target="_blank" rel="noopener noreferrer">Explore Silkfutures →</a></div>
    </div></Reveal>
   </div>
  </section>

  <section className="section ycPathway">
   <div className="container">
    <Reveal><div className="sectionHeading"><div><p className="eyebrow">The Silkfutures framework</p><h2>From expression to leadership.</h2></div><p>Five years of delivery developed a pathway for understanding how creative practice and trusted support can accompany a young person's development.</p></div></Reveal>
    <div className="ycPathwayList">{pathway.map(([name,title,desc],i)=><article key={name}><span>0{i+1}</span><b>{name}</b><h3>{title}</h3><p>{desc}</p></article>)}</div>
    <p className="ycFrameworkNote">A private Silkcrayon booking is a professional studio session, not a Silkfutures mentoring programme. The youth-development experience informs how we build the environment, while Silkfutures programmes and referrals remain separate.</p>
   </div>
  </section>

  <section className="section ycParents">
   <div className="container ycParentsGrid">
    <Reveal><div><p className="eyebrow">For parents & carers</p><h2>A gift they can actually make something with.</h2><p>Instead of choosing a date for them, buy studio hours and let the young creator decide when they are ready to use them.</p><div className="ycParentPoints"><span>01 · Choose anywhere from 1–8 hours</span><span>02 · No session date needed at checkout</span><span>03 · Hours are added for the recipient to use later</span><span>04 · Professional recording environment in Cardiff</span></div></div></Reveal>
    <Reveal delay={100}><aside className="ycParentCard"><p>START HERE</p><h3>Not sure whether studio time is right for them?</h3><span>Tell us what they're interested in — singing, rap, songwriting, production, recording or simply exploring music — and we can point you in the right direction.</span><Link className="button primary" href="/request-a-call">Talk to Silkcrayon →</Link></aside></Reveal>
   </div>
  </section>

  <section className="ycFinal">
   <div className="container">
    <Reveal><p className="eyebrow">A different kind of gift</p><h2>Give their creativity<br/><span>somewhere to go.</span></h2><p>Studio hours from £60. Buy now. They choose the date later.</p><div className="actions"><Link className="button primary large" href="/gift-studio-time">Gift studio time <span>↗</span></Link><Link className="textLink" href="/buy-hours">Buy hours for yourself →</Link></div></Reveal>
   </div>
  </section>
 </main>
}
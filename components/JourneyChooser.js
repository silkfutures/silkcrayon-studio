import Link from 'next/link';

const JOURNEYS=[
 {href:'/booking',eyebrow:'01',title:'Book a session',copy:'You know what you need and when. Pick a date, pick your hours, done.',cta:'Check availability →'},
 {href:'/plan-a-project',eyebrow:'02',title:'Plan a project',copy:'A record, a series, something funded. We scope it together — deliverables, collaborators, budget and deadlines — and come back with a quote.',cta:'Tell us about it →',feature:true},
 {href:'/community',eyebrow:'03',title:'Join the community',copy:'Artists, producers, musicians and videographers. Sessions, meetups and people to make things with.',cta:'Register →'}
];

export default function JourneyChooser({heading='Three ways in',intro='Pick whichever fits where you are.'}){
 return <div className="journeyChooser">
  <div className="journeyChooserHead"><p className="eyebrow">Start here</p><h2>{heading}</h2><p>{intro}</p></div>
  <div className="journeyGrid">
   {JOURNEYS.map(j=><Link key={j.href} href={j.href} className={`journeyCard${j.feature?' feature':''}`}>
    <small>{j.eyebrow}</small>
    <h3>{j.title}</h3>
    <p>{j.copy}</p>
    <span>{j.cta}</span>
   </Link>)}
  </div>
 </div>;
}

import Link from 'next/link';

// One footer for every public page. Grouped by what the visitor is trying to do.
const COLUMNS=[
 {title:'Studio',links:[
  ['/services','Services'],
  ['/recording-studio-cardiff','Recording studio Cardiff'],
  ['/vocal-recording-cardiff','Vocal recording'],
  ['/mixing-mastering-cardiff','Mixing & mastering'],
  ['/dry-hire-cardiff','Studio dry hire'],
  ['/getting-here','Getting here']
 ]},
 {title:'Get involved',links:[
  ['/booking','Book a session'],
  ['/plan-a-project','Plan a project'],
  ['/community','Community'],
  ['/young-creators','Young creators'],
  ['/buy-hours','Studio hour packs'],
  ['/gift-studio-time','Gift studio time']
 ]},
 {title:'Help',links:[
  ['/contact','Contact'],
  ['/faq','FAQ'],
  ['/account/login','My Studio']
 ],external:[
  ['https://instagram.com/silkcrayon','Instagram ↗'],
  ['mailto:info@silkcrayon.com','info@silkcrayon.com']
 ]},
 {title:'Policies',links:[
  ['/terms','Terms'],
  ['/privacy','Privacy'],
  ['/cancellation-policy','Cancellation & refunds'],
  ['/no-harmful-music-policy','No Harmful Music']
 ]}
];

export default function SiteFooter(){
 return <footer className="siteFooter"><div className="container footerGrid siteFooterGrid">
  <div><img src="/logo.png" alt="Silkcrayon"/><p>Cardiff Bay · Recording & creative development</p></div>
  {COLUMNS.map(col=><nav key={col.title} aria-label={col.title}>
   <small className="footerHeading">{col.title}</small>
   {col.links.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}
   {(col.external||[]).map(([href,label])=><a key={href} href={href} {...(href.startsWith('http')?{target:'_blank',rel:'noreferrer'}:{})}>{label}</a>)}
  </nav>)}
 </div></footer>;
}

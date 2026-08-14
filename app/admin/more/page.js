import Link from 'next/link';
import {requireStaff} from '../../../lib/auth';
import {EngineerHeader} from '../../../components/EngineerShell';
import AdminNav from '../../../components/AdminNav';
import {LogoutButton} from '../../../components/AuthForms';

export const dynamic='force-dynamic';
export default async function More(){
 const ctx=await requireStaff(),owner=ctx.profile.role==='owner';
 const links=owner?[
  ['/admin','Owner overview','Bookings, change requests & Stripe sync','⌂'],
  ['/admin/accounting','Accounting','Invoices, refunds & exports','£'],
  ['/admin/activity','Activity log','Cancellations, no-shows & deletions','↻'],
  ['/admin/analytics','Analytics','Revenue, visitors & retention','↗'],
  ['/admin/automation','Automations','Email delivery & reminders','✦'],
  ['/admin/customers','CRM','Full customer database','◎'],
  ['/admin/staff','Staff','People, roles & access','◌']
 ]:[
  ['/admin/artists','Artists','Profiles & history','◎'],
  ['/admin/payments','Payments','Take payment or sell hours','£'],
  ['/admin/sessions','Session reports','Complete & review your reports','✓']
 ];
 return <main className={owner?'engineerApp':'engApp'}>
  {owner?<header className="mobileTop"><div><p className="eyebrow">Studio OS</p><h1>More.</h1><p className="muted">Everything beyond today’s workflow.</p></div><AdminNav profile={ctx.profile}/></header>:<EngineerHeader profile={ctx.profile} eyebrow="More"/>}
  <section className="engWelcome compact"><p className="eyebrow">{owner?'Owner tools':'Engineer tools'}</p><h1>Everything else.</h1><p>Keep the daily app simple. The less-used controls live here.</p></section>
  <section className="engSection"><div className="moreGrid">{links.map(([href,title,desc,icon])=><Link key={href} href={href} className="moreTile"><span>{icon}</span><div><b>{title}</b><small>{desc}</small></div><em>→</em></Link>)}</div></section>
  <section className="engSection"><a className="moreTile" href="/"><span>↗</span><div><b>Public website</b><small>Open silkcrayon.com</small></div><em>→</em></a></section>
  <section className="engSection mobileLogout"><LogoutButton/></section>
  {!owner&&<div style={{height:80}}/>}
  {!owner&&<AdminNav profile={ctx.profile}/>}
 </main>;
}

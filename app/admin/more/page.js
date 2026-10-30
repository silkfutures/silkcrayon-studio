import Link from 'next/link';
import {requireStaff} from '../../../lib/auth';
import {EngineerHeader} from '../../../components/EngineerShell';
import AdminNav from '../../../components/AdminNav';
import {LogoutButton} from '../../../components/AuthForms';
export const dynamic='force-dynamic';
const ownerGroups=[
 {title:'Daily operations',description:'Run the studio',items:[
  ['/admin','Owner overview','Priorities, bookings and outstanding actions','⌂'],
  ['/admin/calendar','Calendar & bookings','Schedule and availability','▦'],
  ['/admin/bookings/new','New booking','Create a studio session','＋'],
  ['/admin/leads','Enquiries','Respond to new requests','✉'],
  ['/admin/projects','Projects & quotes','Manage larger client projects','◆'],
  ['/admin/mixes','Mix & mastering','Job pipeline and deliveries','♫'],
  ['/admin/sessions','Session reports','Review completed work','✓']]},
 {title:'People & team',description:'Your clients and engineers',items:[
  ['/admin/artists','Clients & artists','Profiles and booking history','◎'],
  ['/admin/community','Community','Interests, availability and follow-ups','◎'],
  ['/admin/contacts','Contacts','Contact directory','◌'],
  ['/admin/staff','Engineers & staff','Roles and access','♧'],
  ['/admin/engineer-pay','Engineer payouts','Rates, payouts and exceptions','£'],
  ['/admin/supported-artists','Supported artists','Artist rates and programmes','♫']]},
 {title:'Finance',description:'All money in one place',items:[
  ['/admin/payments','Payments','Transactions and reconciliation','£'],
  ['/admin/invoicing','Invoices','Create, send and track invoices','▤'],
  ['/admin/accounting','Accounting','Revenue, refunds and exports','↗']]},
 {title:'Growth & system',description:'Use when you need them',items:[
  ['/admin/analytics','Analytics','Performance and visitor reporting','▥'],
  ['/admin/campaigns','Campaign performance','Track visits after Instagram posts','↗'],
  ['/admin/marketing','Marketing','Email campaigns and audience','✦'],
  ['/admin/promotions','Promotions','Offers and campaigns','✺'],
  ['/admin/automation','Automations','Reminders and notifications','⚡'],
  ['/admin/activity','Activity log','Auditable history','↻'],
  ['/admin/settings','Settings','Studio configuration','⚙']]}
];
const engineerGroups=[{title:'My workspace',description:'Your assigned work',items:[
 ['/admin/engineer','Today','Upcoming studio sessions','⌂'],
 ['/admin/engineer/mixes','My mixes','Offers and active mix work','♫'],
 ['/admin/calendar','Calendar','Your schedule','▦'],
 ['/admin/engineer/supported-artists','Supported artists','Artist programmes','◎'],
 ['/admin/engineer/payouts','My earnings','Payouts and onboarding','£'],
 ['/admin/sessions','Session reports','Your completed sessions','✓']]}];
export default async function More(){
 const ctx=await requireStaff(),owner=ctx.profile.role==='owner';
 return <main className={owner?'adminPage osMenuPage':'engApp osMenuPage'}>
  <header className={owner?'adminHeader':'mobileTop'}><div><p className="eyebrow">SILKCRAYON · STUDIO OS</p><h1>Workspace</h1><p className="muted">Everything organised by what you need to do.</p></div>{owner?<AdminNav profile={ctx.profile}/>:<EngineerHeader profile={ctx.profile} eyebrow="Workspace"/>}</header>
  <div className="osMenuGroups">{(owner?ownerGroups:engineerGroups).map(group=><section className="osMenuGroup" key={group.title}><div className="osMenuGroupHeading"><h2>{group.title}</h2><p>{group.description}</p></div><div className="osMenuTiles">{group.items.map(([href,title,description,icon])=><Link className="osMenuTile" href={href} key={href}><span className="osMenuIcon" aria-hidden="true">{icon}</span><span className="osMenuTileText"><b>{title}</b><small>{description}</small></span><span className="osMenuArrow" aria-hidden="true">↗</span></Link>)}</div></section>)}</div>
  <div className="osMenuFooter"><Link href="/">Open public website ↗</Link><LogoutButton/></div>
  {!owner&&<AdminNav profile={ctx.profile}/>}
 </main>;
}

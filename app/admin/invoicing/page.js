import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {formatGBP} from '../../../lib/services';
import {formatUkDate} from '../../../lib/dates';
import {invoiceRefGeneral} from '../../../lib/invoiceRules';
import {QbNumbering} from '../../../components/QuickbooksControls';
import DuplicateInvoiceButton from '../../../components/DuplicateInvoiceButton';
import PastInvoices from '../../../components/PastInvoices';
import CompanyForm from '../../../components/CompanyForm';
import {listCompanies} from '../../../lib/companies';
import s from '../../../components/EngineerWork.module.css';
export const dynamic='force-dynamic';
const STATUS={draft:['Draft','queued'],sent:['Awaiting payment','awaiting'],paid:['Paid','paid'],void:['Cancelled','cancelled']};

export default async function Invoicing({searchParams}){
 const ctx=await requireOwner(),db=getAdminDb(),sp=await searchParams;
 const tab=['past','companies'].includes(sp?.tab)?sp.tab:'invoices';
 const filter=['draft','sent','paid','void'].includes(sp?.status)?sp.status:'';
 const tabs=<div className={s.row} style={{marginBottom:6}}><Link className={tab==='invoices'?s.primary:s.secondary} href="/admin/invoicing">Invoices</Link><Link className={tab==='companies'?s.primary:s.secondary} href="/admin/invoicing?tab=companies">Companies</Link><Link className={tab==='past'?s.primary:s.secondary} href="/admin/invoicing?tab=past">Past invoices (QuickBooks)</Link></div>;
 const head=<header className="adminHeader"><div><p className="eyebrow">Money</p><h1>Invoicing</h1><p className="muted">Create and email invoices, take card or bank payment, and see what’s owed. Paid invoices go straight into Accounting.</p></div><AdminNav profile={ctx.profile}/></header>;
 if(tab==='companies'){const list=await listCompanies(db);const {data:open=[]}=await db.from('invoices').select('billing_contact_id,total_pence').eq('status','sent').not('billing_contact_id','is',null);const owed=id=>(open||[]).filter(i=>i.billing_contact_id===id).reduce((n,i)=>n+i.total_pence,0);
  return <main className="adminPage">{head}<section className="adminSection">{tabs}<p className="muted">Organisations you invoice. Their billing address and email fill in automatically when you choose them on an invoice.</p><CompanyForm/></section><section className="adminSection">{list.length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Owed</th><th></th></tr></thead><tbody>{list.map(c=><tr key={c.id}><td><Link className="textLink" href={`/admin/invoicing/companies/${c.id}`}><b>{c.name}</b></Link><small>{String(c.address||'').split('\n').slice(-2).join(', ')}</small></td><td>{c.contact_name||'—'}</td><td>{c.email||<span className={s.message}>No email</span>}</td><td data-sensitive="financial">{owed(c.id)?formatGBP(owed(c.id)):'—'}</td><td><Link className={s.secondary} href={`/admin/invoicing/new?company=${c.id}`}>New invoice</Link></td></tr>)}</tbody></table></div>:<p className={s.muted}>No companies yet. Run the v20.12.53 migration to bring in your QuickBooks companies, or add one above.</p>}</section></main>;}
 if(tab==='past')return <main className="adminPage">{head}<section className="adminSection">{tabs}</section><PastInvoices db={db} sp={sp}/></main>;

 let q=db.from('invoices').select('id,invoice_number,status,bill_to_name,customer_id,title,total_pence,issue_date,due_date,sent_at,paid_at,paid_via,lines').order('created_at',{ascending:false}).limit(200);
 if(filter)q=q.eq('status',filter);
 const [{data:rows,error},{data:projectInv=[]},{data:mode},{data:qbMax=[]}]=await Promise.all([q,
  db.from('project_invoices').select('id,project_id,invoice_number,status,description,amount_pence,due_date,sent_at,paid_at,studio_projects(title,contact_name)').order('created_at',{ascending:false}).limit(50),
  db.from('studio_settings').select('value').eq('key','invoice_numbering_mode').maybeSingle(),
  db.from('quickbooks_invoices').select('qb_number').eq('txn_type','Invoice').order('invoice_date',{ascending:false}).limit(400)]);
 if(error)return <main className="adminPage">{head}<section className="adminSection"><p className="muted">Run <b>supabase/v20-12-52-invoicing.sql</b> in Supabase to start invoicing.</p></section></main>;
 const list=rows||[];
 const lastQb=(qbMax||[]).reduce((m,r)=>/^\d+$/.test(r.qb_number)?Math.max(m,Number(r.qb_number)):m,0);
 const lastOs=list.reduce((m,r)=>/^\d+$/.test(r.invoice_number||'')?Math.max(m,Number(r.invoice_number)):m,0);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
 const owed=list.filter(r=>r.status==='sent'),overdue=owed.filter(r=>r.due_date&&r.due_date<today);
 const month=today.slice(0,7),paidMonth=list.filter(r=>r.status==='paid'&&String(r.paid_at||'').startsWith(month));
 const sum=a=>a.reduce((n,r)=>n+Number(r.total_pence||0),0);
 const openProject=(projectInv||[]).filter(p=>p.status==='sent');
 return <main className="adminPage">{head}
  <section className="adminSection">{tabs}
   <div className={s.stats}><div><small>Owed to you</small><b data-sensitive="financial">{formatGBP(sum(owed)+openProject.reduce((n,p)=>n+p.amount_pence,0))}</b><small>{owed.length+openProject.length} unpaid</small></div><div><small>Overdue</small><b data-sensitive="financial">{formatGBP(sum(overdue))}</b><small>{overdue.length} invoice{overdue.length===1?'':'s'}</small></div><div><small>Paid this month</small><b data-sensitive="financial">{formatGBP(sum(paidMonth))}</b><small>{paidMonth.length} invoice{paidMonth.length===1?'':'s'}</small></div><div><small>Drafts</small><b>{list.filter(r=>r.status==='draft').length}</b></div></div>
   <div className={s.row}><Link className={s.primary} href="/admin/invoicing/new">+ New invoice</Link>{mode?.value!=='sequential'&&<span className={s.message}>Set your next invoice number below so invoices continue from QuickBooks.</span>}</div>
  </section>
  <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Invoices</p><h2>{filter?STATUS[filter][0]:'All invoices'}</h2></div><div className={s.row}>{['','sent','paid','draft','void'].map(f=><Link key={f||'all'} className={filter===f?s.primary:s.secondary} href={f?`/admin/invoicing?status=${f}`:'/admin/invoicing'}>{f?STATUS[f][0]:'All'}</Link>)}</div></div>
   <div className={s.tableWrap}><table className={s.table}><thead><tr><th>No.</th><th>Customer</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
    {list.map(r=>{const [label,cls]=STATUS[r.status];const late=r.status==='sent'&&r.due_date&&r.due_date<today;return <tr key={r.id}><td><Link className="textLink" href={`/admin/invoicing/${r.id}`}><b>{r.status==='draft'?'Draft':invoiceRefGeneral(r)}</b></Link></td><td>{r.bill_to_name}<small>{r.title||(r.lines||[]).map(l=>l.service||l.description).filter(Boolean).join(', ').slice(0,60)}</small></td><td>{r.issue_date?formatUkDate(r.issue_date):'—'}</td><td>{r.due_date?formatUkDate(r.due_date):'—'}{late&&<small style={{color:'#ff8f8f'}}>Overdue</small>}</td><td data-sensitive="financial"><b>{formatGBP(r.total_pence)}</b></td><td><span className={`${s.pill} ${s[late?'failed':cls]||''}`}>{late?'Overdue':label}</span></td><td><div className={s.row}>{r.status==='sent'&&<Link className={s.primary} href={`/admin/invoicing/${r.id}?recordPayment=1`}>Mark paid</Link>}{r.status!=='draft'&&<DuplicateInvoiceButton fromInvoiceId={r.id} small/>}</div></td></tr>;})}
    {!filter&&(projectInv||[]).map(p=><tr key={p.id}><td><Link className="textLink" href={`/admin/projects/${p.project_id}`}><b>{p.invoice_number||'Project'}</b></Link></td><td>{p.studio_projects?.contact_name}<small>Project · {p.studio_projects?.title}</small></td><td>{p.sent_at?formatUkDate(p.sent_at.slice(0,10)):'—'}</td><td>{p.due_date?formatUkDate(p.due_date):'—'}</td><td data-sensitive="financial"><b>{formatGBP(p.amount_pence)}</b></td><td><span className={`${s.pill} ${s[STATUS[p.status]?.[1]||'queued']}`}>{STATUS[p.status]?.[0]||p.status}</span></td><td></td></tr>)}
    {!list.length&&!(projectInv||[]).length&&<tr><td colSpan="7">No invoices yet. Press <b>+ New invoice</b> to create your first one.</td></tr>}
   </tbody></table></div></section>
  <section className="adminSection"><p className="eyebrow">Numbering</p><QbNumbering suggested={Math.max(lastQb,lastOs)+1||1001} enabled={mode?.value==='sequential'} lastQb={lastQb||null}/></section>
 </main>;
}

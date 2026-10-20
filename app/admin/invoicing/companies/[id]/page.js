import Link from 'next/link';
import {notFound} from 'next/navigation';
import AdminNav from '../../../../../components/AdminNav';
import CompanyForm from '../../../../../components/CompanyForm';
import {requireOwner} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {formatGBP} from '../../../../../lib/services';
import {formatUkDate} from '../../../../../lib/dates';
import {invoiceRefGeneral} from '../../../../../lib/invoiceRules';
import s from '../../../../../components/EngineerWork.module.css';
export const dynamic='force-dynamic';
const STATUS={draft:['Draft','queued'],sent:['Awaiting payment','awaiting'],paid:['Paid','paid'],void:['Cancelled','cancelled']};
export default async function Company({params}){
 const ctx=await requireOwner(),db=getAdminDb(),{id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const [{data:co},{data:invs=[]}]=await Promise.all([db.from('billing_contacts').select('*').eq('id',id).maybeSingle(),db.from('invoices').select('id,invoice_number,status,total_pence,issue_date,due_date,title,lines').eq('billing_contact_id',id).order('created_at',{ascending:false})]);
 if(!co)notFound();
 const {data:qb=[]}=await db.from('quickbooks_invoices').select('id,qb_number,invoice_date,amount_pence,memo').ilike('customer_name',co.name).order('invoice_date',{ascending:false}).limit(50).then(r=>r.error?{data:[]}:r);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
 const owed=(invs||[]).filter(i=>i.status==='sent').reduce((n,i)=>n+i.total_pence,0),paid=(invs||[]).filter(i=>i.status==='paid').reduce((n,i)=>n+i.total_pence,0);
 return <main className="adminPage"><header className="adminHeader"><div><Link href="/admin/invoicing?tab=companies" className="backLink">← Companies</Link><p className="eyebrow">Company</p><h1>{co.name}</h1><p className="muted">{[co.contact_name&&`FAO ${co.contact_name}`,co.email,co.phone].filter(Boolean).join(' · ')||'No contact details yet'}</p></div><AdminNav profile={ctx.profile}/></header>
  <section className="adminSection"><div className={s.stats}><div><small>Owed</small><b data-sensitive="financial">{formatGBP(owed)}</b></div><div><small>Paid (Studio OS)</small><b data-sensitive="financial">{formatGBP(paid)}</b></div><div><small>Invoices</small><b>{(invs||[]).length}</b></div><div><small>QuickBooks invoices</small><b>{(qb||[]).length}</b></div></div>
   <div className={s.row}><Link className={s.primary} href={`/admin/invoicing/new?company=${co.id}`}>+ New invoice for {co.name}</Link></div></section>
  <section className="adminSection"><CompanyForm company={co}/></section>
  <section className="adminSection"><p className="eyebrow">Invoices</p>{(invs||[]).length?<div className={s.tableWrap}><table className={s.table}><thead><tr><th>No.</th><th>Date</th><th>For</th><th>Amount</th><th>Status</th></tr></thead><tbody>{invs.map(i=>{const [l,c]=STATUS[i.status];const late=i.status==='sent'&&i.due_date&&i.due_date<today;return <tr key={i.id}><td><Link className="textLink" href={`/admin/invoicing/${i.id}`}><b>{i.status==='draft'?'Draft':invoiceRefGeneral(i)}</b></Link></td><td>{i.issue_date?formatUkDate(i.issue_date):''}</td><td>{i.title||(i.lines||[]).map(x=>x.service||x.description).filter(Boolean).join(', ').slice(0,60)}</td><td data-sensitive="financial">{formatGBP(i.total_pence)}</td><td><span className={`${s.pill} ${s[late?'failed':c]}`}>{late?'Overdue':l}</span></td></tr>;})}</tbody></table></div>:<p className={s.muted}>No Studio OS invoices yet.</p>}
   {(qb||[]).length>0&&<><p className="eyebrow" style={{marginTop:22}}>From QuickBooks</p><div className={s.history}>{qb.map(q=><div className={s.historyRow} key={q.id}><span className={s.position}>Q</span><div><b>Invoice {q.qb_number}</b><small>{q.invoice_date?formatUkDate(q.invoice_date):''}{q.memo?` · ${q.memo}`:''}</small></div><b data-sensitive="financial">{formatGBP(q.amount_pence)}</b></div>)}</div></>}
  </section></main>;
}

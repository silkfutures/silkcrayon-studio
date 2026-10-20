import Link from 'next/link';
import {notFound} from 'next/navigation';
import AdminNav from '../../../../components/AdminNav';
import InvoiceEditor from '../../../../components/InvoiceEditor';
import InvoiceActions from '../../../../components/InvoiceActions';
import {requireOwner} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {getStudioSettings} from '../../../../lib/studioSettings';
import {getInvoiceBank} from '../../../../lib/projectInvoices';
import {listCompanies} from '../../../../lib/companies';
import {invoiceRefGeneral} from '../../../../lib/invoiceRules';
import {formatGBP} from '../../../../lib/services';
import {formatUkDate} from '../../../../lib/dates';
import s from '../../../../components/EngineerWork.module.css';
export const dynamic='force-dynamic';
const STATUS={draft:['Draft','queued'],sent:['Awaiting payment','awaiting'],paid:['Paid','paid'],void:['Cancelled','cancelled']};
const VIA={stripe:'card',bank_transfer:'bank transfer',cash:'cash',other:'other'};

export default async function InvoicePage({params,searchParams}){
 const ctx=await requireOwner(),db=getAdminDb(),{id}=await params,sp=await searchParams;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {data:inv}=await db.from('invoices').select('*').eq('id',id).maybeSingle();if(!inv)notFound();
 const head=<header className="adminHeader"><div><Link href="/admin/invoicing" className="backLink">← Invoicing</Link><p className="eyebrow">Invoice</p><h1>{inv.status==='draft'?'Draft invoice':`Invoice ${invoiceRefGeneral(inv)}`}</h1><p className="muted">{inv.bill_to_name}{inv.bill_to_email?` · ${inv.bill_to_email}`:''}</p></div><AdminNav profile={ctx.profile}/></header>;
 if(inv.status==='draft'){
  const [{data:customers=[]},pricing,bank]=await Promise.all([db.from('customers').select('id,full_name,artist_name,email,phone').order('artist_name').limit(5000),getStudioSettings(),getInvoiceBank(db).catch(()=>({complete:false,termsDays:7}))]);
 const companies=await listCompanies(db);
  return <main className="adminPage">{head}<section className="adminSection"><InvoiceActions invoice={inv}/></section><InvoiceEditor customers={customers||[]} companies={companies} initial={inv} hourlyPence={pricing.studioHourlyPricePence} termsDays={bank.termsDays??7} bankComplete={bank.complete}/></main>;
 }
 const [label,cls]=STATUS[inv.status];
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
 const late=inv.status==='sent'&&inv.due_date&&inv.due_date<today;
 return <main className="adminPage">{head}
  {sp?.sent==='1'&&<section className="adminSection"><p className={s.message}>✓ Invoice emailed to {inv.bill_to_email}.</p></section>}
  {sp?.sent==='failed'&&<section className="adminSection"><p className={s.message}>The invoice was saved but the email failed{inv.email_error?` (${inv.email_error})`:''}. Press Resend.</p></section>}
  <section className="adminSection"><div className={s.statusRow}><span className={`${s.pill} ${s[late?'failed':cls]||''}`}>{late?'Overdue':label}</span><span className={s.muted}>{inv.issue_date?`Issued ${formatUkDate(inv.issue_date)}`:''}{inv.due_date?` · due ${formatUkDate(inv.due_date)}`:''}{inv.sent_at?` · emailed ${formatUkDate(inv.sent_at.slice(0,10))}`:''}{inv.paid_at?` · paid ${formatUkDate(inv.paid_at.slice(0,10))} by ${VIA[inv.paid_via]||inv.paid_via}`:''}</span></div>
   <div className={s.tableWrap} style={{marginTop:14}}><table className={s.table}><thead><tr><th>Date</th><th>Service</th><th>Description</th><th>Qty</th><th>Rate</th><th style={{textAlign:'right'}}>Amount</th></tr></thead><tbody>{(inv.lines||[]).map((l,i)=><tr key={i}><td>{l.date?formatUkDate(l.date):''}</td><td>{l.service}{l.type!=='custom'&&<small>{l.type==='booking'?'Booking':'Logged session'}</small>}</td><td>{l.description}</td><td>{l.qty}</td><td data-sensitive="financial">{formatGBP(l.rate_pence)}</td><td style={{textAlign:'right'}} data-sensitive="financial"><b>{formatGBP(l.amount_pence)}</b></td></tr>)}</tbody></table></div>
   <div className={s.feeBox} style={{marginTop:14}}><div><small>{inv.status==='paid'?'Paid':'Balance due'}</small><b data-sensitive="financial">{formatGBP(inv.total_pence)}</b></div>{inv.status==='paid'&&<span className={s.muted}>In Accounting{(inv.lines||[]).some(l=>l.type==='booking')?' · sessions marked paid':''}</span>}</div>
   {inv.notes&&<p className={s.muted}>Notes: {inv.notes}</p>}
   {inv.paid_note&&<p className={s.muted}>Payment note: {inv.paid_note}</p>}
  </section>
  <section className="adminSection"><InvoiceActions invoice={inv}/></section>
 </main>;
}

import {loadReceiptRows} from '../../../lib/receiptData';
import AdminNav from '../../../components/AdminNav';
import AccountingCorrectionActions from '../../../components/AccountingCorrectionActions';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import {formatGBP} from '../../../lib/services';
export const dynamic='force-dynamic';
export default async function Accounting(){
 const ctx=await requireOwner(),db=getAdminDb();
 const rows=await loadReceiptRows(db);
 const gross=rows.reduce((n,x)=>n+x.amount,0),refunds=rows.reduce((n,x)=>n+x.refund,0),net=gross-refunds;
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Finance</p><h1>Accounting</h1><p className="muted">Collected sales, invoices, refunds and corrections in one place.</p><p><a className="textLink" href="/admin/accounting/quickbooks">QuickBooks archive →</a></p></div><AdminNav profile={ctx.profile}/></header>
 <section className="osMetrics"><div><small>Gross collected</small><b data-sensitive="financial">{formatGBP(gross)}</b></div><div><small>Refunded</small><b data-sensitive="financial">{formatGBP(refunds)}</b></div><div><small>Net collected</small><b data-sensitive="financial">{formatGBP(net)}</b></div><div><small>Invoices linked</small><b>{rows.filter(x=>x.invoice).length}</b></div></section>
 <section className="adminSection accountingTools"><div><p className="eyebrow">Export</p><h2>Bookkeeping-ready CSV</h2><p className="muted">Exports customer, date, gross amount, refund amount, net amount, Stripe invoice number and status.</p></div><a data-sensitive="financial" className="button outline" href="/api/admin/accounting/export">Download CSV</a></section>
 <section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Ledger</p><h2>Transactions</h2><p data-sensitive="financial" className="muted">If a manual payment was marked paid by mistake, correct it here. The amount leaves revenue immediately while the correction remains auditable.</p></div></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Description</th><th>Gross</th><th>Refund</th><th>Net</th><th>Status</th><th>Invoice</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={`${r.source}-${r.id}`}><td>{r.date?String(r.date).slice(0,10)+(r.dateEstimated?' (estimated)':''):'Payment date missing'}</td><td><b>{r.name||'—'}</b><small>{r.email||''}</small></td><td data-sensitive="financial">{r.description}<small>{r.kind}</small></td><td data-sensitive="financial">{formatGBP(r.amount)}</td><td data-sensitive="financial">{r.refund?formatGBP(r.refund):'—'}</td><td data-sensitive="financial">{formatGBP(r.amount-r.refund)}</td><td>{r.status}</td><td data-sensitive="financial">{r.invoice?<a className="textLink" target="_blank" href={r.invoice}>{r.number||'View'} ↗</a>:'—'}</td><td>{r.source==='mix_job'?<a className="textLink" href={`/admin/mixes/${r.id}`}>View mix →</a>:<AccountingCorrectionActions row={r}/>}</td></tr>)}</tbody></table></div></section>
 <section className="adminSection"><p className="eyebrow">Tax</p><h2>VAT treatment is not automated.</h2><p className="muted">The system records gross sales and refunds. Configure VAT only if/when your accountant confirms the correct treatment for Silkcrayon.</p></section></main>
}

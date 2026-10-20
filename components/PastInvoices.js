import Link from 'next/link';
import {formatGBP} from '../lib/services';
import {formatUkDate} from '../lib/dates';
import {QbStatus} from '../components/QuickbooksControls';
import s from '../components/EngineerWork.module.css';
const PAGE=50;
const LABEL={paid:'Paid',unpaid:'Unpaid',unrecorded:'Payment not recorded',void:'Void'};
const CLS={paid:'paid',unpaid:'failed',unrecorded:'queued',void:'cancelled'};

export default async function PastInvoices({db,sp}){
 const type=['Invoice','Sales Receipt'].includes(sp?.type)?sp.type:'Invoice';
 const status=['paid','unpaid','unrecorded','void'].includes(sp?.status)?sp.status:'';
 const term=String(sp?.q||'').trim().slice(0,60);
 const page=Math.max(0,Number(sp?.page)||0);
 let q=db.from('quickbooks_invoices').select('id,qb_number,txn_type,customer_name,customer_id,invoice_date,amount_pence,status,memo,lines',{count:'exact'}).eq('txn_type',type).order('invoice_date',{ascending:false}).order('qb_number',{ascending:false}).range(page*PAGE,page*PAGE+PAGE-1);
 if(status)q=q.eq('status',status);
 if(term)q=/^\d+$/.test(term)?q.eq('qb_number',term):q.ilike('customer_name',`%${term.replace(/[%_]/g,'')}%`);
 const [{data:rows=[],count=0,error},{data:all=[]},{data:mode}]=await Promise.all([q,db.from('quickbooks_invoices').select('txn_type,amount_pence,status,qb_number'),db.from('studio_settings').select('value').eq('key','invoice_numbering_mode').maybeSingle()]);
 if(error)return <section className="adminSection"><p className="muted">Run the v20-12-51 migration and the QuickBooks data import to see your past QuickBooks invoices here.</p></section>;
 const inv=(all||[]).filter(r=>r.txn_type==='Invoice'),sr=(all||[]).filter(r=>r.txn_type==='Sales Receipt');
 const lastQb=inv.reduce((m,r)=>/^\d+$/.test(r.qb_number)?Math.max(m,Number(r.qb_number)):m,0);
 const sum=list=>list.reduce((n,r)=>n+Number(r.amount_pence||0),0);
 const link=(o)=>{const p=new URLSearchParams({tab:'past',type,...(status?{status}:{}),...(term?{q:term}:{}),...o});for(const [k,v] of [...p.entries()])if(v==='')p.delete(k);return `/admin/invoicing?${p}`;};
 return <>
  <section className="adminSection"><div className={s.stats}><div><small>Invoices</small><b>{inv.length}</b><small data-sensitive="financial">{formatGBP(sum(inv))}</small></div><div><small>Sales receipts</small><b>{sr.length}</b><small data-sensitive="financial">{formatGBP(sum(sr))}</small></div><div><small>Marked unpaid</small><b>{inv.filter(r=>r.status==='unpaid').length}</b><small data-sensitive="financial">{formatGBP(sum(inv.filter(r=>r.status==='unpaid')))}</small></div><div><small>Payment not recorded</small><b>{inv.filter(r=>r.status==='unrecorded').length}</b><small>QuickBooks never logged payment</small></div></div>
   <p className="muted">Your QuickBooks history, kept for your records (not added to Studio OS revenue). QuickBooks only recorded payment against a couple of invoices, so most show “Payment not recorded”. If you want to chase anything, set it to <b>Unpaid</b>; set others to <b>Paid</b> as you check them. It’s optional — this archive is just for your records.</p>
</section>
  <section className="adminSection">
   <form className={s.row} action="/admin/invoicing" style={{marginBottom:14}}><input type="hidden" name="tab" value="past"/>
    <select name="type" defaultValue={type} className={s.select}><option>Invoice</option><option>Sales Receipt</option></select>
    <select name="status" defaultValue={status} className={s.select}><option value="">Any status</option>{Object.entries(LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <input name="q" defaultValue={term} placeholder="Customer or number" className={s.select}/><button className={s.secondary}>Search</button>{(term||status)&&<Link className="textLink" href={`/admin/invoicing?tab=past&type=${encodeURIComponent(type)}`}>Clear</Link>}
   </form>
   <div className={s.tableWrap}><table className={s.table}><thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>What for</th><th>Amount</th><th>{type==='Invoice'?'Payment':''}</th></tr></thead><tbody>
    {(rows||[]).map(r=><tr key={r.id}><td><b>{r.qb_number}</b></td><td>{r.invoice_date?formatUkDate(r.invoice_date):'—'}</td><td>{r.customer_id?<Link className="textLink" href={`/admin/artists/${r.customer_id}`}>{r.customer_name}</Link>:r.customer_name||'—'}</td>
     <td>{(r.lines||[]).length?<details><summary>{(r.lines||[]).filter(l=>l.description).map(l=>l.description).join(', ').slice(0,70)||`${r.lines.length} line${r.lines.length===1?'':'s'}`}</summary>{r.lines.map((l,i)=><small key={i} data-sensitive="financial">{l.description||l.account} · {formatGBP(l.amount_pence)}</small>)}</details>:r.memo||'—'}</td>
     <td data-sensitive="financial"><b>{formatGBP(r.amount_pence)}</b></td><td>{type==='Invoice'?<QbStatus id={r.id} status={r.status}/>:<span className={`${s.pill} ${s.paid}`}>Paid</span>}</td></tr>)}
    {!(rows||[]).length&&<tr><td colSpan="6">Nothing found.</td></tr>}
   </tbody></table></div>
   <div className={s.row} style={{marginTop:14}}>{page>0&&<Link className={s.secondary} href={link({page:String(page-1)})}>← Newer</Link>}<span className={s.muted}>{count?`${page*PAGE+1}–${Math.min(count,(page+1)*PAGE)} of ${count}`:''}</span>{(page+1)*PAGE<count&&<Link className={s.secondary} href={link({page:String(page+1)})}>Older →</Link>}</div>
  </section></>;
}

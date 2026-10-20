import Link from 'next/link';
import AdminNav from '../../../../components/AdminNav';
import InvoiceEditor from '../../../../components/InvoiceEditor';
import {requireOwner} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {getStudioSettings} from '../../../../lib/studioSettings';
import {getInvoiceBank} from '../../../../lib/projectInvoices';
export const dynamic='force-dynamic';
export default async function NewInvoice({searchParams}){
 const ctx=await requireOwner(),db=getAdminDb(),sp=await searchParams;
 const [{data:customers=[]},pricing,bank]=await Promise.all([db.from('customers').select('id,full_name,artist_name,email,phone').order('artist_name').limit(5000),getStudioSettings(),getInvoiceBank(db).catch(()=>({complete:false,termsDays:7}))]);
 return <main className="adminPage"><header className="adminHeader"><div><Link href="/admin/invoicing" className="backLink">← Invoicing</Link><p className="eyebrow">Invoicing</p><h1>New invoice</h1><p className="muted">Pick the artist (or type in anyone), add unpaid past sessions or your own lines, then email it.</p></div><AdminNav profile={ctx.profile}/></header>
  <InvoiceEditor customers={customers||[]} key={sp?.customer||'new'} hourlyPence={pricing.studioHourlyPricePence} termsDays={bank.termsDays??7} bankComplete={bank.complete} preselect={sp?.customer||''}/></main>;
}

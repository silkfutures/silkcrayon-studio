import {getAdminDb} from '../../../lib/supabase';
import {invoiceByToken,getInvoiceBank} from '../../../lib/projectInvoices';
import {invoiceRef} from '../../../lib/projectInvoiceRules';
import {formatGBP} from '../../../lib/services';
import InvoicePayButton from '../../../components/InvoicePayButton';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Pay your invoice — Silkcrayon',robots:{index:false,follow:false,noarchive:true,nosnippet:true}};
function prettyDate(v){try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(`${v}T12:00:00Z`));}catch{return v;}}

export default async function PayInvoice({params,searchParams}){
 const {token}=await params,sp=await searchParams,db=getAdminDb();
 const invoice=await invoiceByToken(db,token);
 const shell=body=><main className="idCheckPage"><section className="idCheckShell"><p className="eyebrow">Silkcrayon · Invoice</p>{body}</section></main>;
 if(!invoice)return shell(<><h1>This payment link isn’t active.</h1><p>It may have been replaced by a newer invoice email. Use the latest email from Silkcrayon, or reply to it and we’ll help.</p></>);
 const p=invoice.studio_projects||{},ref=invoiceRef(invoice);
 const head=<><h1>{formatGBP(invoice.amount_pence)}</h1><div className="idCheckIntro"><h2 style={{margin:'0 0 6px'}}>{p.title}</h2><p style={{margin:0}}>{invoice.description}<br/>Reference: <b>{ref}</b>{invoice.due_date&&invoice.status==='sent'?<><br/>Due by {prettyDate(invoice.due_date)}</>:null}</p></div></>;
 if(invoice.status==='paid')return shell(<>{head}<div className="idCheckComplete"><span>✓</span><h2>Paid — thank you.</h2><p>A receipt has been emailed to you.</p></div></>);
 if(invoice.status==='void')return shell(<>{head}<div className="idCheckSubmitted"><span>×</span><h2>This invoice was cancelled.</h2><p>Please don’t pay it. Contact Silkcrayon if you think this is a mistake.</p></div></>);
 if(sp?.paid==='1')return shell(<>{head}<div className="idCheckComplete"><span>✓</span><h2>Thank you — your payment is being confirmed.</h2><p>You’ll get a receipt by email in a moment. No need to pay again.</p></div></>);
 const bank=await getInvoiceBank(db);
 return shell(<>{head}<h2>Pay by card</h2><p>Secure checkout by Stripe. Apple Pay and Google Pay work where available.</p><InvoicePayButton token={token} label={`Pay ${formatGBP(invoice.amount_pence)} by card`}/>{bank.complete&&<div className="idCheckIntro" style={{marginTop:28}}><h2 style={{margin:'0 0 6px'}}>Or pay by bank transfer</h2><p style={{margin:0}}>Account name: <b>{bank.name}</b><br/>Sort code: <b>{bank.sortCode}</b><br/>Account number: <b>{bank.accountNumber}</b><br/>Reference: <b>{ref}</b></p><p style={{margin:'10px 0 0',color:'#aaa1ae'}}>Please use one method only. We’ll email a receipt once it arrives.</p></div>}</>);
}

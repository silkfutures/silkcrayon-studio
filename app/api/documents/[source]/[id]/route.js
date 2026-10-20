import {documentEmail} from '../../../../../lib/documentEmail';
import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getCustomerContext} from '../../../../../lib/customerAuth';
import {getAdminDb} from '../../../../../lib/supabase';
import {canAccessDocumentSource} from '../../../../../lib/documentModel';
import {ensureDocument} from '../../../../../lib/documents';
import {renderDocumentPdf} from '../../../../../lib/documentPdf';
import {sendEmail} from '../../../../../lib/notifications';
import {documentNumber,documentFilename} from '../../../../../lib/documentNumber';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function load(params){
 const {source,id}=await params;if(!['booking','project','invoice'].includes(source)||!/^[0-9a-f-]{36}$/i.test(id))return {error:'Not found.',status:404};
 const [staffContext,customerContext]=await Promise.all([getStaffContext(),getCustomerContext()]);
 // Invoices, receipts and quotes are owner/customer documents. Engineers never download or send them.
 const staff=staffContext?.profile?.role==='owner'?staffContext:null;
 if(staffContext&&!staff&&!customerContext)return {error:'Only the studio owner can access invoices and receipts.',status:403};
 if(!staff&&!customerContext)return {error:'Sign in to access documents.',status:401};
 if(source==='invoice'&&!staff)return {error:'Document not found.',status:404};
 const db=getAdminDb();let {data:record,error}=await db.from(source==='booking'?'bookings':source==='invoice'?'invoices':'studio_projects').select(source==='booking'?'*,customers(*)':'*').eq('id',id).maybeSingle();
 if(error)throw error;if(!record||(source!=='invoice'&&!canAccessDocumentSource(source,record,staff,customerContext?.customer)))return {error:'Document not found.',status:404};
 let sentSnapshots=null;
 if(source==='project'&&staff?.profile?.role!=='owner'){const {data:sent,error:e}=await db.from('project_quote_emails').select('snapshot,revision,pdf_document_id').eq('project_id',id).eq('status','sent').order('revision',{ascending:false});if(e)throw e;if(!sent?.length)return {error:'Quote not found.',status:404};sentSnapshots=sent;record=sentSnapshots[0].snapshot;}
 return {db,source,record,staff,sentSnapshots,customer:source==='booking'?record.customers:{full_name:record.contact_name,email:record.email}};
}
export async function GET(req,{params}){try{
 const x=await load(params);if(x.error)return NextResponse.json({error:x.error},{status:x.status});
 const search=new URL(req.url).searchParams;
 const allowedIds=x.sentSnapshots?await Promise.all(x.sentSnapshots.map(async sent=>sent.pdf_document_id||(await ensureDocument(x.db,'project',sent.snapshot)).id)):null;
 if(search.get('history')==='1'){const {data,error}=await x.db.from('studio_documents').select('id,kind,created_at').eq('source_type',x.source).eq('source_id',x.record.id).order('id',{ascending:false});if(error)throw error;return NextResponse.json({documents:allowedIds?data.filter(d=>allowedIds.some(id=>String(id)===String(d.id))):data},{headers:{'Cache-Control':'private, no-store'}});}
 let doc;
 if(search.has('version')||allowedIds){const version=search.get('version')||String(allowedIds[0]);if(!/^\d+$/.test(version))return NextResponse.json({error:'Not found.'},{status:404});const {data,error}=await x.db.from('studio_documents').select('*').eq('id',version).eq('source_type',x.source).eq('source_id',x.record.id).maybeSingle();if(error)throw error;if(!data||(allowedIds&&!allowedIds.some(id=>String(id)===String(data.id))))return NextResponse.json({error:'Not found.'},{status:404});doc={...data,number:documentNumber(data)};}
 else if(x.source==='invoice'){const docId=x.record.receipt_document_id||x.record.document_id;if(!docId)return NextResponse.json({error:'Send the invoice first.'},{status:404});const {data,error}=await x.db.from('studio_documents').select('*').eq('id',docId).single();if(error)throw error;doc={...data,number:documentNumber(data)};}
 else doc=await ensureDocument(x.db,x.source,x.record,x.customer);
 const bytes=await renderDocumentPdf(doc);
 return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${documentFilename(doc)}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){console.error('PDF download failed',e);return NextResponse.json({error:'Could not generate PDF. Check the PDF migration and try again.'},{status:500});}}
export async function POST(req,{params}){try{
 const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const x=await load(params);if(x.error)return NextResponse.json({error:x.error},{status:x.status});
 if(!x.staff)return NextResponse.json({error:'Staff access required to email documents.'},{status:403});
 if(x.source==='project')return NextResponse.json({error:'Use Send quote in the quote editor to email the reviewed version.'},{status:400});
 if(x.source==='invoice')return NextResponse.json({error:'Use Resend on the invoice instead.'},{status:400});
 if(!x.customer?.email)return NextResponse.json({error:'No customer email recorded.'},{status:400});
 const doc=await ensureDocument(x.db,x.source,x.record,x.customer),bytes=await renderDocumentPdf(doc);
 const result=await sendEmail({to:x.customer.email,...documentEmail(doc),attachments:[{filename:documentFilename(doc),content:bytes.toString('base64'),content_type:'application/pdf'}],source:`PDF ${doc.snapshot.kind} · ${doc.number}`,actor:{id:x.staff.user.id,name:x.staff.profile.full_name,role:x.staff.profile.role}});
 return NextResponse.json(result.ok?{ok:true,message:'PDF emailed to the customer.'}:{error:'Email failed. Check Automations and retry.'},{status:result.ok?200:502});
 }catch(e){console.error('PDF email failed',e);return NextResponse.json({error:'Could not email PDF. Check the PDF migration and email settings.'},{status:500});}}

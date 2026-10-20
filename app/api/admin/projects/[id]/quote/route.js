import {renderDocumentPdf} from '../../../../../../lib/documentPdf';
import {ensureDocument} from '../../../../../../lib/documents';
import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {sendEmail} from '../../../../../../lib/notifications';
import {projectQuoteEmail} from '../../../../../../lib/projectQuoteEmail';
import {quoteLines} from '../../../../../../lib/quoteTemplates';
export async function POST(req,{params}){try{
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const {id}=await params,body=await req.json(),db=getAdminDb();
 const {data:p,error}=await db.from('studio_projects').select('*').eq('id',id).single();if(error)throw error;
 if(Number(body.revision)!==p.quote_revision)return NextResponse.json({error:'The quote changed. Refresh and review the latest version before sending.'},{status:409});
 if(!p.email||!p.quote_scope||!p.quote_handover||!p.quote_exclusions||!p.quote_turnaround||!quoteLines(p).length)return NextResponse.json({error:'Save the scope, handover, exclusions, timing and prices before sending. A customer email is required.'},{status:400});
 const payload={project_id:id,revision:p.quote_revision,recipient:p.email,status:'sending',snapshot:p};
 let {data:log,error:insertError}=await db.from('project_quote_emails').insert(payload).select('id').single();
 if(insertError){
  if(insertError.code!=='23505')throw insertError;
  const {data:previous,error:previousError}=await db.from('project_quote_emails').select('id,status').eq('project_id',id).eq('revision',p.quote_revision).single();if(previousError)throw previousError;
  if(previous.status==='sent')return NextResponse.json({ok:true,duplicate:true,message:'This version was already sent.'});
  if(previous.status==='sending')return NextResponse.json({error:'This quote is already sending. Check delivery before trying again.'},{status:409});
  const {data:claimed,error:claimError}=await db.from('project_quote_emails').update({status:'sending',error:null}).eq('id',previous.id).eq('status','failed').select('id').maybeSingle();if(claimError)throw claimError;if(!claimed)return NextResponse.json({error:'Another send is already running.'},{status:409});log=claimed;
 }
 let result,pdfDocumentId=null;try{const doc=await ensureDocument(db,'project',p);pdfDocumentId=doc.id;const attachments=[{filename:`${doc.number}.pdf`,content:(await renderDocumentPdf(doc)).toString('base64'),content_type:'application/pdf'}];result=await sendEmail({attachments,to:p.email,...projectQuoteEmail(p),source:'Customer quote · version '+p.quote_revision,actor:{id:ctx.user.id,name:ctx.profile.full_name,role:ctx.profile.role}});}catch(error){result={ok:false,error:error.message||'PDF generation failed'};}
 const {error:logError}=await db.from('project_quote_emails').update({pdf_document_id:pdfDocumentId,status:result.ok?'sent':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok?new Date().toISOString():null}).eq('id',log.id);
 if(logError)return NextResponse.json({ok:result.ok,error:'Delivery status could not be saved. Check the email provider before resending.'},{status:502});
 return NextResponse.json(result.ok?{ok:true,message:`Quote emailed to ${p.email}.`}:{error:'Quote saved, but email failed. Check email settings and retry.'},{status:result.ok?200:502});
 }catch(error){return NextResponse.json({error:error.message||'Could not send quote.'},{status:500});}}

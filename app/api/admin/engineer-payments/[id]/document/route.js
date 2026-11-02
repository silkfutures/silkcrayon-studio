import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {renderDocumentPdf} from '../../../../../../lib/documentPdf';
import {documentSeller} from '../../../../../../lib/documentModel';
export async function GET(req,{params}){
 const ctx=await getStaffContext();if(!ctx)return new NextResponse('Staff access required',{status:403});
 const {id}=await params;const {data:b,error}=await getAdminDb().from('engineer_payment_batches').select('*').eq('id',id).maybeSingle();
 if(error||!b)return new NextResponse('Payment not found',{status:404});
 if(ctx.profile.role!=='owner'&&ctx.user.id!==b.engineer_user_id)return new NextResponse('Access denied',{status:403});
 const snapshot={kind:'payment_record',seller:documentSeller(),customer:{name:b.engineer_name},rows:b.items.map(i=>({date:i.date,service:i.type==='mix'?'Mix engineering':'Session engineering',description:i.description,qty:1,rate:i.amount_pence,amount:i.amount_pence})),total:b.amount_pence,received:b.amount_pence,due:0,terms:'Paid by bank',invoiceRef:`Payment reference: ${b.reference}`,sections:[{title:'Payment recorded',text:`Paid ${b.paid_on}. Itemised studio record of an external payment. Reference supplied by the studio; this is not a supplier-issued invoice.`}]};
 const bytes=await renderDocumentPdf({number:b.reference,created_at:b.created_at,snapshot});
 return new NextResponse(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="engineer-payment-${b.id}.pdf"`,'Cache-Control':'private, no-store'}});
}

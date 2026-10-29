import {NextResponse} from 'next/server';
import {requireOwner} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {LEAD_STATUSES} from '../../../../../lib/leadPipeline';
export async function PATCH(req,{params}){try{
 await requireOwner();const {id}=await params,b=await req.json(),db=getAdminDb();
 const patch={updated_at:new Date().toISOString()};
 if(b.status!==undefined){if(!LEAD_STATUSES.some(s=>s.key===b.status))return NextResponse.json({error:'Unknown enquiry status.'},{status:400});patch.status=b.status}
 if(b.notes!==undefined){const notes=String(b.notes||'');if(notes.length>4000)return NextResponse.json({error:'Notes are too long (maximum 4,000 characters).'},{status:400});patch.notes=notes}
 if(Object.keys(patch).length===1)return NextResponse.json({error:'Nothing to update.'},{status:400});
 const {data,error}=await db.from('leads').update(patch).eq('id',id).select('id,status,notes').single();
 if(error)throw error;if(!data)return NextResponse.json({error:'Enquiry not found.'},{status:404});
 return NextResponse.json({ok:true,lead:data});
}catch(e){return NextResponse.json({error:e.message||'Could not update enquiry.'},{status:500})}}
export async function DELETE(req,{params}){try{await requireOwner();const {id}=await params,db=getAdminDb(),{data:lead,error}=await db.from('leads').select('*').eq('id',id).single();if(error||!lead)return NextResponse.json({error:'Enquiry not found.'},{status:404});const {error:de}=await db.from('leads').delete().eq('id',id);if(de)throw de;const {data:customer}=await db.from('customers').select('id').eq('email',lead.email).maybeSingle();if(!customer)await db.from('crm_contacts').delete().eq('email',lead.email).eq('source','Website enquiry');return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e.message||'Could not delete enquiry.'},{status:500})}}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {updateCompany} from '../../../../../lib/companies';
function guard(req,ctx){if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});return null;}
export async function PATCH(req,{params}){
 const ctx=await getStaffContext();const bad=guard(req,ctx);if(bad)return bad;
 try{const {id}=await params,b=await req.json().catch(()=>({}));const db=getAdminDb();
  if(b.action==='archive'){const {error}=await db.from('billing_contacts').update({archived:true,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;return NextResponse.json({ok:true});}
  const r=await updateCompany(db,id,b);return NextResponse.json(r,{status:r.ok?200:r.status||400});}
 catch{return NextResponse.json({error:'Could not save the company.'},{status:500});}
}

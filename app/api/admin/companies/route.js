import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {createCompany} from '../../../../lib/companies';
export async function POST(req){
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
 try{const r=await createCompany(getAdminDb(),await req.json().catch(()=>({})));return NextResponse.json(r,{status:r.ok?200:r.status||400});}
 catch{return NextResponse.json({error:'Could not save the company. Check the v20.12.53 migration has been applied.'},{status:500});}
}

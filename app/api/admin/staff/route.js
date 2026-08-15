import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';

export async function POST(req){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const b=await req.json();
  if(!b.fullName||!b.email||!b.password)return NextResponse.json({error:'Name, email and password are required.'},{status:400});
  if(String(b.password).length<10)return NextResponse.json({error:'Temporary password must be at least 10 characters.'},{status:400});
  if(!['owner','engineer'].includes(b.role||'engineer'))return NextResponse.json({error:'Invalid role.'},{status:400});
  const db=getAdminDb(),email=String(b.email).trim().toLowerCase(),fullName=String(b.fullName).trim(),engineerName=String(b.engineerName||fullName).trim(),phone=String(b.phone||'').trim()||null;
  const {data,error}=await db.auth.admin.createUser({email,password:String(b.password),email_confirm:true,user_metadata:{full_name:fullName}});
  if(error)throw error;
  const {error:pe}=await db.from('staff_profiles').insert({user_id:data.user.id,full_name:fullName,engineer_name:engineerName,email,phone,role:b.role||'engineer',active:true});
  if(pe){await db.auth.admin.deleteUser(data.user.id);throw pe}
  return NextResponse.json({ok:true,user_id:data.user.id});
 }catch(e){return NextResponse.json({error:e.message||'Could not create staff account.'},{status:500})}
}
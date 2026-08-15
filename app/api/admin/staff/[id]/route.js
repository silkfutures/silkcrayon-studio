import { NextResponse } from 'next/server';
import { getStaffContext } from '../../../../../lib/auth';
import { getAdminDb } from '../../../../../lib/supabase';

function clean(v,n=254){return String(v??'').trim().slice(0,n)}

export async function PATCH(req,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,b=await req.json(),db=getAdminDb();
  if(id===ctx.user.id&&b.active===false)return NextResponse.json({error:'You cannot deactivate your own owner account.'},{status:400});

  const {data:target,error:te}=await db.from('staff_profiles').select('*').eq('user_id',id).maybeSingle();
  if(te)throw te;
  if(!target)return NextResponse.json({error:'Staff member not found.'},{status:404});

  if(target.role==='owner'&&target.active&&(b.active===false||b.role==='engineer')){
   const {count}=await db.from('staff_profiles').select('user_id',{count:'exact',head:true}).eq('role','owner').eq('active',true);
   if(Number(count||0)<=1)return NextResponse.json({error:'Silkcrayon must always have at least one active owner.'},{status:409});
  }

  const patch={updated_at:new Date().toISOString()};
  if(typeof b.active==='boolean')patch.active=b.active;
  if(b.role&&['owner','engineer'].includes(b.role))patch.role=b.role;
  if(Object.prototype.hasOwnProperty.call(b,'fullName')){
   const v=clean(b.fullName,120);if(!v)return NextResponse.json({error:'Display name is required.'},{status:400});patch.full_name=v;
  }
  if(Object.prototype.hasOwnProperty.call(b,'engineerName'))patch.engineer_name=clean(b.engineerName,120)||null;
  if(Object.prototype.hasOwnProperty.call(b,'phone'))patch.phone=clean(b.phone,40)||null;
  if(Object.prototype.hasOwnProperty.call(b,'photoUrl'))patch.photo_url=clean(b.photoUrl,500)||null;

  if(Object.prototype.hasOwnProperty.call(b,'email')){
   const email=clean(b.email).toLowerCase();
   if(!email||!email.includes('@'))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
   const {error:authError}=await db.auth.admin.updateUserById(id,{email});
   if(authError)throw authError;
   patch.email=email;
  }

  const {data,error}=await db.from('staff_profiles').update(patch).eq('user_id',id).select().single();
  if(error)throw error;
  return NextResponse.json(data);
 }catch(e){
  console.error('Staff update failed',e);
  return NextResponse.json({error:e.message||'Could not update staff profile.'},{status:500});
 }
}
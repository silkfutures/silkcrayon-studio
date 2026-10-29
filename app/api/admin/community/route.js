import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {communityStatuses} from '../../../../lib/community';
export async function PATCH(request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin'},{status:403});
 const ctx=await getStaffContext();
 if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required'},{status:403});
 try{
  const b=await request.json();
  if(!b||typeof b.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id)||!communityStatuses.includes(b.status)||typeof b.notes!=='string'||b.notes.length>4000)return NextResponse.json({error:'Invalid follow-up details'},{status:400});
  const {data,error}=await getAdminDb().from('community_interests').update({status:b.status,notes:b.notes.trim(),updated_at:new Date().toISOString()}).eq('id',b.id).select('id,status,notes,updated_at').maybeSingle();
  if(error)return NextResponse.json({error:'Unable to save changes. Please retry.'},{status:500});
  if(!data)return NextResponse.json({error:'Registration not found'},{status:404});
  return NextResponse.json({registration:data});
 }catch{return NextResponse.json({error:'Invalid request'},{status:400})}
}

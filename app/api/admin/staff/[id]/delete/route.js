import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
export async function DELETE(req,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params;
  const body=await req.json().catch(()=>({}));
  if(body.confirm!=='DELETE TEST')return NextResponse.json({error:'Confirmation required.'},{status:400});
  if(id===ctx.user.id)return NextResponse.json({error:'Cannot delete your own account.'},{status:403});
  const db=getAdminDb();
  const {data:target,error:te}=await db.from('staff_profiles').select('user_id,role,active,full_name').eq('user_id',id).maybeSingle();
  if(te)throw te;
  if(!target)return NextResponse.json({error:'Staff profile not found.'},{status:404});
  if(target.role!=='engineer'||target.active)return NextResponse.json({error:'Only disabled engineer profiles can be deleted.'},{status:409});
  if(!/^test$/i.test(String(target.full_name||'').trim()))return NextResponse.json({error:'This deletion action is restricted to the old Test profile.'},{status:403});
  for(const [table,column] of [['bookings','engineer_user_id'],['session_reports','submitted_by_user_id'],['studio_payments','created_by_user_id'],['customers','registered_by_user_id']]){
   const {count,error}=await db.from(table).select('*',{count:'exact',head:true}).eq(column,id);
   if(error)return NextResponse.json({error:`Could not verify historical references in ${table}. Nothing was deleted.`},{status:409});
   if(count>0)return NextResponse.json({error:`Cannot delete this profile: ${count} historical ${table} record(s) reference it. Keep it disabled.`},{status:409});
  }
  const {error:del}=await db.auth.admin.deleteUser(id);
  if(del)throw del;
  // The auth identity may have a database cascade; remove a remaining staff profile explicitly.
  const {error:profileDel}=await db.from('staff_profiles').delete().eq('user_id',id);
  if(profileDel)throw profileDel;
  return NextResponse.json({ok:true});
 }catch(e){console.error('Test staff delete failed',e);return NextResponse.json({error:'Could not delete the test account. No further action is needed until reviewed.'},{status:500});}
}
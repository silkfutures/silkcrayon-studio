import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {ensureCallPrep} from '../../../../../lib/callPrep';

export async function POST(req){
 try{
  const ctx=await getStaffContext();
  if(!ctx)return NextResponse.json({error:'Staff access required.'},{status:401});
  const body=await req.json(),sourceType=String(body.sourceType||''),sourceId=String(body.sourceId||'');
  if(!['booking','enquiry'].includes(sourceType)||!sourceId)return NextResponse.json({error:'Choose a valid booking or enquiry.'},{status:400});
  if(sourceType==='enquiry'&&ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(sourceType==='booking'&&ctx.profile.role==='engineer'){
   const {data:booking}=await getAdminDb().from('bookings').select('engineer_user_id').eq('id',sourceId).maybeSingle();
   if(!booking||booking.engineer_user_id&&booking.engineer_user_id!==ctx.user.id)return NextResponse.json({error:'This session is assigned to another engineer.'},{status:403});
  }
  const result=await ensureCallPrep({sourceType,sourceId,force:Boolean(body.regenerate),createdBy:ctx.user.id});
  return NextResponse.json({ok:true,...result});
 }catch(error){
  console.error('AI call prep failed',error);
  const message=error?.message||'Could not prepare this call.';
  return NextResponse.json({error:message},{status:/OPENAI_API_KEY/.test(message)?503:500});
 }
}

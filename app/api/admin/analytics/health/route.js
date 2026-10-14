import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {rateLimit} from '../../../../../lib/rateLimit';
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required'},{status:403});
  if(!await rateLimit(req,{scope:'analytics-health',limit:6,windowSeconds:60,throwOnUnavailable:true}))return NextResponse.json({error:'Please wait a minute before checking again.'},{status:429});
  const db=getAdminDb();
  // Diagnostic rows are excluded from reporting, even if cleanup fails.
  const {data,error}=await db.from('page_views').insert({path:'/__analytics_check',visitor_id:null,referrer:null}).select('id').single();
  if(error)throw error;
  const {error:cleanupError}=await db.from('page_views').delete().eq('id',data.id);if(cleanupError)console.error('Analytics diagnostic cleanup failed',cleanupError.message);
  return NextResponse.json({ok:true,message:'Database writes and rate limiting are working. Open a public page in a separate tab, then refresh analytics to check browser tracking too.'});
 }catch(error){console.error('Analytics health check failed',error.message);return NextResponse.json({ok:false,error:'Tracking check failed. Check the Supabase environment settings, page_views table, and consume_api_rate_limit migration in the deployment logs.'},{status:503});}
}

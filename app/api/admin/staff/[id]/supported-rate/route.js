import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {programmeTerms} from '../../../../../../lib/supportedArtists';
export async function PATCH(req,{params}){try{
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});
 const {id}=await params,b=await req.json();let rate;try{rate=programmeTerms({hourlyPrice:b.hourlyPrice},NaN).hourly_price_pence;}catch(e){return NextResponse.json({error:e.message},{status:400});}
 const {data,error}=await getAdminDb().from('staff_profiles').update({supported_hourly_price_pence:rate,updated_at:new Date().toISOString()}).eq('user_id',id).select('user_id,supported_hourly_price_pence').single();if(error||!data)throw error||Error('Not found');
 return NextResponse.json({ok:true});
}catch{return NextResponse.json({error:'Could not save the engineer rate. Check that the latest migration has been applied.'},{status:500});}}

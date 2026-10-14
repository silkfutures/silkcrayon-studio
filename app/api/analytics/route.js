import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/supabase';
import {rateLimit} from '../../../lib/rateLimit';
export async function POST(req){try{
 if(!await rateLimit(req,{scope:'analytics',limit:120,windowSeconds:60,throwOnUnavailable:true}))return NextResponse.json({ok:false,error:'Too many requests'},{status:429});
 const b=await req.json(),path=String(b.path||'').split(/[?#]/)[0];
 if(!path.startsWith('/')||path.startsWith('//')||/^\/(admin|account|api)(\/|$)/.test(path)||path==='/__analytics_check')return NextResponse.json({ok:false},{status:400});
 let referrer=null;try{referrer=b.referrer?new URL(b.referrer).origin:null;}catch{}
 const {error}=await getAdminDb().from('page_views').insert({path:path.slice(0,300),referrer,visitor_id:String(b.visitorId||'').slice(0,100)||null});
 if(error)throw error;
 return NextResponse.json({ok:true});
 }catch(error){console.error('Analytics write failed',error.message);return NextResponse.json({ok:false,error:'Analytics storage unavailable'},{status:503});}
}

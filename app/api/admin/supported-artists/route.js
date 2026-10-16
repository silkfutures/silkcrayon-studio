import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {sendEmail} from '../../../../lib/notifications';
import {escapeProgrammeHtml as esc} from '../../../../lib/supportedArtists';
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin))return NextResponse.json({error:'Invalid origin.'},{status:403});
  const b=await req.json(),db=getAdminDb();
  const {data:app,error:readError}=await db.from('supported_artists').select('*').eq('id',b.id).single();if(readError||!app)return NextResponse.json({error:'Application not found.'},{status:404});
  let updated=app;
  if(b.action!=='resend'){
   if(!['approved','rejected','paused'].includes(b.action))return NextResponse.json({error:'Invalid action.'},{status:400});
   const patch={status:b.action,reviewed_by:ctx.user.id,reviewed_at:new Date().toISOString()};
   if(b.action==='approved'){
    const dates=[b.startsOn,b.endsOn];if(dates.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x||'')||Number.isNaN(Date.parse(x)))||b.endsOn<b.startsOn)return NextResponse.json({error:'Choose valid programme dates.'},{status:400});
    const weekdays=Array.isArray(b.weekdays)?[...new Set(b.weekdays.map(Number))]:[];
    if(!weekdays.length||weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.startTime||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.endTime||'')||b.endTime<=b.startTime)return NextResponse.json({error:'Choose eligible days and a valid time window.'},{status:400});
    const {data:eng}=await db.from('staff_profiles').select('user_id').eq('user_id',b.engineerId).eq('active',true).in('role',['owner','engineer']).maybeSingle();if(!eng)return NextResponse.json({error:'Choose an active engineer.'},{status:400});
    let {data:customer,error}=await db.from('customers').select('id').eq('email',app.email).maybeSingle();if(error)throw error;
    if(!customer){const result=await db.from('customers').insert({email:app.email,full_name:app.full_name,artist_name:app.artist_name}).select('id').single();if(result.error){const retry=await db.from('customers').select('id').eq('email',app.email).single();if(retry.error)throw result.error;customer=retry.data;}else customer=result.data;}
    Object.assign(patch,{customer_id:customer.id,engineer_user_id:eng.user_id,starts_on:b.startsOn,ends_on:b.endsOn,weekdays,start_time:b.startTime,end_time:b.endTime});
   }
   const result=await db.from('supported_artists').update(patch).eq('id',app.id).select('*').single();if(result.error)throw result.error;updated=result.data;
  }
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const details=updated.status==='approved'?`Your £30/hour studio rate is active from ${esc(updated.starts_on)} to ${esc(updated.ends_on)}. Two-hour minimum; up to eight hours per calendar month. Eligible days: ${updated.weekdays.map(d=>days[d]).join(', ')}, ${updated.start_time.slice(0,5)}–${updated.end_time.slice(0,5)} (UK time). Sign in using ${esc(updated.email)}, then open Supported Artists in My Studio. Unused hours do not roll over; no combined discounts or automatic renewal.`:updated.status==='paused'?'Your supported rate has been paused. Existing paid bookings remain in place. Please contact the studio if you have questions.':'Thank you for applying. We’re unable to offer a supported place at this time.';
  const delivery=await sendEmail({to:updated.email,source:'Supported artists decision',subject:updated.status==='approved'?'Your Silkcrayon supported artist place': 'Your Silkcrayon supported artist application',html:`<h1>Hello ${esc(updated.artist_name)}</h1><p>${details}</p><p><a href="${base}/account/supported-artists">Open your artist account</a></p>`});
  return NextResponse.json({ok:true,emailSent:!!delivery.ok,message:delivery.ok?'Saved and email sent.':'Saved, but email was not sent. Use Resend decision email to retry.'});
 }catch(e){console.error('Supported artist review failed',e.message);return NextResponse.json({error:'Could not complete this update. Refresh to check its status before retrying.'},{status:500});}
}

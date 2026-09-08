import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {encryptCalendarUrl,verifyAppleCalendarUrl,syncAppleCalendar} from '../../../../lib/appleCalendarSync';

async function owner(){const ctx=await getStaffContext();return !!ctx&&ctx.profile.role==='owner'}
export async function POST(req){try{
 if(!await owner())return NextResponse.json({error:'Owner access required.'},{status:403});
 const body=await req.json(),name=String(body.name||'').trim().slice(0,80);if(!name)return NextResponse.json({error:'Give this calendar a name.'},{status:400});
 const url=await verifyAppleCalendarUrl(body.url),db=getAdminDb(),row={name,feed_url_encrypted:encryptCalendarUrl(url),active:true,block_all_day:body.blockAllDay!==false,buffer_before_minutes:Math.min(240,Math.max(0,Number(body.bufferBefore)||0)),buffer_after_minutes:Math.min(240,Math.max(0,Number(body.bufferAfter)||0))};
 const {data,error}=await db.from('external_calendars').insert(row).select('*').single();if(error)throw error;
 try{const result=await syncAppleCalendar(data);return NextResponse.json({ok:true,count:result.count});}catch(e){return NextResponse.json({ok:true,warning:e.message||'Connected, but the first sync failed.'});}
}catch(e){return NextResponse.json({error:e.name==='AbortError'?'Apple Calendar took too long to respond.':e.message||'Could not connect calendar.'},{status:400})}}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {encryptCalendarUrl,verifyAppleCalendarUrl,syncAppleCalendar} from '../../../../../lib/appleCalendarSync';

async function owner(){const ctx=await getStaffContext();return !!ctx&&ctx.profile.role==='owner'}
const allowedServices=value=>Array.isArray(value)?value.filter(x=>['dry-hire','artist-development'].includes(x)):[];
export async function PATCH(req,{params}){try{
 if(!await owner())return NextResponse.json({error:'Owner access required.'},{status:403});const {id}=await params,body=await req.json(),db=getAdminDb(),patch={updated_at:new Date().toISOString()};
 if('name'in body){patch.name=String(body.name||'').trim().slice(0,80);if(!patch.name)return NextResponse.json({error:'Calendar name cannot be blank.'},{status:400})}
 if('active'in body)patch.active=!!body.active;if('blockAllDay'in body)patch.block_all_day=!!body.blockAllDay;
 if('bufferBefore'in body)patch.buffer_before_minutes=Math.min(240,Math.max(0,Number(body.bufferBefore)||0));if('bufferAfter'in body)patch.buffer_after_minutes=Math.min(240,Math.max(0,Number(body.bufferAfter)||0));
 if('ignoredServiceSlugs'in body)patch.ignored_service_slugs=allowedServices(body.ignoredServiceSlugs);
 if(body.url){const url=await verifyAppleCalendarUrl(body.url);patch.feed_url_encrypted=encryptCalendarUrl(url)}
 const {data,error}=await db.from('external_calendars').update(patch).eq('id',id).select('*').single();if(error)throw error;
 const result=await syncAppleCalendar(data);return NextResponse.json({ok:true,count:result.count});
}catch(e){return NextResponse.json({error:e.message||'Could not update calendar.'},{status:400})}}
export async function DELETE(req,{params}){try{
 if(!await owner())return NextResponse.json({error:'Owner access required.'},{status:403});const {id}=await params,{error}=await getAdminDb().from('external_calendars').delete().eq('id',id);if(error)throw error;return NextResponse.json({ok:true});
}catch(e){return NextResponse.json({error:e.message||'Could not disconnect calendar.'},{status:400})}}

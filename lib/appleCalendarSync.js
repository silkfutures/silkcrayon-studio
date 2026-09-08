import crypto from 'node:crypto';
import ical from 'node-ical';
import {getAdminDb} from './supabase.js';

const STUDIO_TZ='Europe/London';
const MAX_FEED_BYTES=5*1024*1024;

function encryptionKey(){
 const seed=String(process.env.CALENDAR_SYNC_ENCRYPTION_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'');
 if(!seed)throw new Error('Calendar encryption is not configured.');
 return crypto.createHash('sha256').update(`silkcrayon-calendar-sync:${seed}`).digest();
}
export function encryptCalendarUrl(value){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv),body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),body.toString('base64url')].join('.');
}
export function decryptCalendarUrl(value){
 const [version,iv,tag,body]=String(value||'').split('.');if(version!=='v1'||!iv||!tag||!body)throw new Error('Stored calendar connection is invalid.');
 const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(iv,'base64url'));decipher.setAuthTag(Buffer.from(tag,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString('utf8');
}
export function normaliseAppleFeedUrl(raw){
 const input=String(raw||'').trim().replace(/^webcal:/i,'https:');let url;
 try{url=new URL(input)}catch{throw new Error('Paste a valid Apple Calendar subscription URL.');}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||!(host==='icloud.com'||host.endsWith('.icloud.com'))||!url.pathname.includes('/published/'))throw new Error('Use the public subscription link copied from Apple Calendar.');
 url.username='';url.password='';url.hash='';return url.toString();
}
function londonParts(date){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:STUDIO_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const x=Object.fromEntries(parts.map(p=>[p.type,p.value]));return {date:`${x.year}-${x.month}-${x.day}`,time:`${x.hour}:${x.minute}:${x.second}`};
}
function dateOnly(date){return date?.dateOnly===true||date?.isDate===true}
function addDays(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function splitInstance(instance,source){
 let start=new Date(instance.start),end=new Date(instance.end||instance.start);if(!Number.isFinite(start.valueOf())||!Number.isFinite(end.valueOf())||end<=start)return [];
 const allDay=!!instance.isFullDay||dateOnly(instance.start)||dateOnly(instance.end);
 if(allDay&&!source.block_all_day)return [];
 if(!allDay){start=new Date(start.getTime()-Number(source.buffer_before_minutes||0)*60000);end=new Date(end.getTime()+Number(source.buffer_after_minutes||0)*60000);}
 const first=londonParts(start).date,last=londonParts(new Date(end.getTime()-1)).date,rows=[];let date=first,guard=0;
 while(date<=last&&guard++<370){
  const startPart=date===first?londonParts(start).time:'00:00:00',endPart=date===last?londonParts(end).time:'23:59:59';
  rows.push({booking_date:date,start_time:startPart,end_time:endPart==='00:00:00'?'23:59:59':endPart,reason:`${source.name} — Busy`,external_event_key:crypto.createHash('sha256').update(`${instance.uid||''}|${instance.recurrenceId||''}|${start.toISOString()}|${date}`).digest('hex')});
  date=addDays(date,1);
 }
 return rows;
}
async function fetchFeed(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(url,{redirect:'error',signal:controller.signal,headers:{accept:'text/calendar, text/plain;q=0.8','user-agent':'Silkcrayon-Studio-Calendar-Sync/1.0'}});
  if(!response.ok)throw new Error(`Apple Calendar returned ${response.status}.`);
  const length=Number(response.headers.get('content-length')||0);if(length>MAX_FEED_BYTES)throw new Error('Calendar feed is too large.');
  const text=await response.text();if(Buffer.byteLength(text)>MAX_FEED_BYTES)throw new Error('Calendar feed is too large.');
  if(!text.includes('BEGIN:VCALENDAR'))throw new Error('That link did not return an Apple calendar.');return text;
 }finally{clearTimeout(timer)}
}
export async function blocksFromCalendarText(source,text,{from=new Date(Date.now()-7*86400000),to=new Date(Date.now()+370*86400000)}={}){
 const parsed=await ical.async.parseICS(text),blocks=[];
 for(const event of Object.values(parsed)){
  if(event?.type!=='VEVENT'||!event.start||String(event.status||'').toUpperCase()==='CANCELLED'||String(event.transparency||'').toUpperCase()==='TRANSPARENT')continue;
  const instances=event.rrule?ical.expandRecurringEvent(event,{from,to,includeOverrides:true,excludeExdates:true,expandOngoing:true}):[{...event,isFullDay:dateOnly(event.start)}];
  for(const instance of instances){const instanceEnd=instance.end||instance.start;if(instanceEnd>=from&&instance.start<=to)blocks.push(...splitInstance(instance,source));}
 }
 return blocks;
}
async function blocksFromFeed(source,url){return blocksFromCalendarText(source,await fetchFeed(url))}
export async function verifyAppleCalendarUrl(raw){const url=normaliseAppleFeedUrl(raw),source={name:'Apple Calendar',block_all_day:true,buffer_before_minutes:0,buffer_after_minutes:0};await blocksFromFeed(source,url);return url;}
export async function syncAppleCalendar(source){
 const db=getAdminDb(),now=new Date().toISOString();
 try{
  if(!source.active){await db.rpc('replace_external_calendar_blockouts',{p_source_id:source.id,p_blocks:[]});return {id:source.id,count:0,skipped:true};}
  const blocks=await blocksFromFeed(source,decryptCalendarUrl(source.feed_url_encrypted));
  const {error}=await db.rpc('replace_external_calendar_blockouts',{p_source_id:source.id,p_blocks:blocks});if(error)throw error;
  await db.from('external_calendars').update({last_synced_at:now,last_error:null,updated_at:now}).eq('id',source.id);
  return {id:source.id,count:blocks.length};
 }catch(error){await db.from('external_calendars').update({last_error:String(error.message||'Sync failed').slice(0,500),updated_at:now}).eq('id',source.id);throw error;}
}
export async function syncAllAppleCalendars(){
 const {data:sources=[],error}=await getAdminDb().from('external_calendars').select('*').eq('active',true);if(error)throw error;
 const results=[];for(const source of sources){try{results.push(await syncAppleCalendar(source))}catch(e){results.push({id:source.id,error:e.message||'Sync failed'})}}return results;
}

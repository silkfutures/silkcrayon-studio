import {getAdminDb} from './supabase';
import {getStaffContext} from './auth';
// All application-controlled email/SMS transports use this audit boundary.
export async function deliverWithActivity({channel='email',to,subject,source='Studio message',actor=null},deliver){
 let db,log;
 try{
  db=getAdminDb();
  if(!actor){try{const ctx=await getStaffContext();if(ctx)actor={id:ctx.user.id,name:ctx.profile.full_name,role:ctx.profile.role};}catch{}}
  const {data,error}=await db.from('message_activity').insert({channel,recipient:Array.isArray(to)?to.join(', '):String(to||''),subject:String(subject||'').slice(0,500),source,actor_user_id:actor?.id||null,actor_name:actor?.name||null,actor_role:actor?.role||'system',status:'sending'}).select('id').single();
  if(error)throw error;log=data;
 }catch(error){console.error('Message activity unavailable',error?.message);return {ok:false,error:'Message was not sent because its activity record could not be saved. Check the Automations database update.'};}
 let result;
 try{result=await deliver();}catch(error){result={ok:false,error:error.message||'Message provider unavailable'};}
 try{
  const {error}=await db.from('message_activity').update({status:result.ok?(result.scheduled?'scheduled':'sent'):result.skipped?'skipped':'failed',provider_id:result.id||null,error:result.error||null,sent_at:result.ok&&!result.scheduled?new Date().toISOString():null}).eq('id',log.id);
  if(error)throw error;
 }catch(error){console.error('Message status update failed',log.id,error?.message);return {...result,activityId:log.id,auditWarning:'Provider result could not be saved. Check provider before resending.'};}
 return {...result,activityId:log.id};
}

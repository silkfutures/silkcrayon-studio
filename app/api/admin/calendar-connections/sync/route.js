import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {syncAppleCalendar,syncAllAppleCalendars} from '../../../../../lib/appleCalendarSync';
export async function POST(req){try{
 const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const body=await req.json().catch(()=>({}));if(!body.id)return NextResponse.json({ok:true,results:await syncAllAppleCalendars()});
 const {data,error}=await getAdminDb().from('external_calendars').select('*').eq('id',body.id).single();if(error)throw error;const result=await syncAppleCalendar(data);return NextResponse.json({ok:true,result});
}catch(e){return NextResponse.json({error:e.message||'Calendar sync failed.'},{status:400})}}

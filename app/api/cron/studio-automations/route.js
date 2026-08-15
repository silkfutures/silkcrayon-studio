import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {sendLoggedNotification,reminderEmail,bookAgainEmail} from '../../../../lib/notifications';
import {sendLoggedSms} from '../../../../lib/sms';
import {londonDateOffset} from '../../../../lib/time';

export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return new NextResponse('CRON_SECRET not configured',{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new NextResponse('Unauthorized',{status:401});
 const db=getAdminDb(),tomorrow=londonDateOffset(1),yesterday=londonDateOffset(-1);
 const [{data:upcoming=[]},{data:past=[]}]=await Promise.all([
  db.from('bookings').select('*,customers(*)').eq('booking_date',tomorrow).eq('status','confirmed'),
  db.from('bookings').select('*,customers(*)').eq('booking_date',yesterday).in('status',['confirmed','completed'])
 ]);
 let sent=0;
 for(const b of upcoming){
  const c=b.customers;if(!c?.email)continue;
  const [{count:priorCount},{data:staff}]=await Promise.all([
   db.from('bookings').select('id',{count:'exact',head:true}).eq('customer_id',c.id).lt('booking_date',b.booking_date).in('status',['confirmed','completed']),
   b.engineer_user_id
    ? db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email').eq('user_id',b.engineer_user_id).maybeSingle()
    : Promise.resolve({data:null})
  ]);
  const msg=reminderEmail(b,c,{firstTime:Number(priorCount||0)===0,engineer:staff||null});
  const r=await sendLoggedNotification({booking:b,customer:c,type:'session_reminder',...msg});if(r.ok)sent++;
  if(b.sms_reminder_consent&&c.phone){
   const name=staff?.engineer_name||staff?.full_name||'';
   const contact=staff?.phone||'';
   const engineer=name?(contact?` Engineer ${name} — text ${contact} when you reach the lane.`:` Engineer: ${name}.`):'';
   const sms=await sendLoggedSms({booking:b,customer:c,type:'session_reminder_sms',body:`Silkcrayon reminder: tomorrow at ${String(b.start_time).slice(0,5)}.${engineer} Getting here: https://silkcrayon.com/getting-here`});
   if(sms.ok)sent++;
  }
 }
 for(const b of past){
  const c=b.customers;if(!c?.email)continue;
  const msg=bookAgainEmail(b,c),r=await sendLoggedNotification({booking:b,customer:c,type:'book_again',...msg});if(r.ok)sent++;
 }
 return NextResponse.json({ok:true,tomorrow,yesterday,checked:upcoming.length+past.length,sent});
}
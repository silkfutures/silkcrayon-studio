import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {sendLoggedNotification,reminderEmail,bookAgainEmail} from '../../../../lib/notifications';
import {sendLoggedSms} from '../../../../lib/sms';
import {londonDateOffset} from '../../../../lib/time';
import {formatUkDate} from '../../../../lib/dates';
import {ensureDryHireIdRequest,DRY_HIRE_ID_BUCKET} from '../../../../lib/dryHireId';

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return new NextResponse('CRON_SECRET not configured',{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return new NextResponse('Unauthorized',{status:401});
 const db=getAdminDb(),today=londonDateOffset(0),tomorrow=londonDateOffset(1),yesterday=londonDateOffset(-1),nowIso=new Date().toISOString();
 const {data:expiredDeliveries=[]}=await db.from('session_deliveries').select('id,storage_path').eq('delivery_type','upload').is('deleted_at',null).not('expires_at','is',null).lte('expires_at',nowIso).limit(200);
 let deliveriesDeleted=0;
 for(const d of expiredDeliveries){
  if(d.storage_path){
   let paths=[d.storage_path];
   try{const parsed=JSON.parse(d.storage_path);if(Array.isArray(parsed))paths=parsed.map(x=>x?.path).filter(Boolean)}catch{}
   const {error:removeError}=await db.storage.from('session-deliveries').remove(paths);if(removeError)continue;
  }
  const {error:updateError}=await db.from('session_deliveries').update({deleted_at:nowIso}).eq('id',d.id);if(!updateError)deliveriesDeleted++;
 }
 const {data:expiredIdDocs=[]}=await db.from('dry_hire_id_checks').select('id,status,storage_path').not('storage_path','is',null).is('deleted_at',null).not('document_expires_at','is',null).lte('document_expires_at',nowIso).limit(100);
 let idDocsDeleted=0;
 for(const check of expiredIdDocs){
  const {error:removeError}=await db.storage.from(DRY_HIRE_ID_BUCKET).remove([check.storage_path]);if(removeError)continue;
  const nextStatus=check.status==='submitted'?'expired':check.status;
  const {error:updateError}=await db.from('dry_hire_id_checks').update({storage_path:null,deleted_at:nowIso,status:nextStatus,updated_at:nowIso}).eq('id',check.id);if(!updateError)idDocsDeleted++;
 }
 const preferredDefault=String(process.env.DEFAULT_ENGINEER_USER_ID||'').trim();
 let {data:defaultEngineer}=preferredDefault?await db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email,role,active').eq('user_id',preferredDefault).eq('active',true).maybeSingle():{data:null};
 if(!defaultEngineer){const {data:owner}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email,role,active').eq('role','owner').eq('active',true).limit(1).maybeSingle();defaultEngineer=owner||null;}
 const [{data:upcoming=[]},{data:past=[]},{data:balanceDue=[]}]=await Promise.all([
  db.from('bookings').select('*,customers(*)').eq('booking_date',tomorrow).eq('status','confirmed'),
  db.from('bookings').select('*,customers(*)').eq('booking_date',yesterday).in('status',['confirmed','completed']),
  db.from('bookings').select('*,customers(*)').in('status',['pending','confirmed','completed']).eq('payment_status','unpaid').not('balance_reminder_date','is',null).is('balance_reminder_sent_at',null).lte('balance_reminder_date',today).limit(100)
 ]);
 let sent=0,balanceRemindersSent=0;
 for(const b of balanceDue){
  const c=b.customers;if(!c)continue;
  const paid=Math.max(0,Number(b.amount_paid_pence||0)),total=Math.max(0,Number(b.amount_pence||0)),remaining=Math.max(0,total-paid);
  if(!remaining){await db.from('bookings').update({balance_reminder_sent_at:nowIso}).eq('id',b.id);continue;}
  const amount=`£${(remaining/100).toFixed(2)}`,artist=esc(c.artist_name||c.full_name||'there'),url=String(b.balance_payment_url||'').trim();
  const button=url?`<p><a href="${esc(url)}" style="display:inline-block;background:#C394FF;color:#09050d;padding:14px 20px;text-decoration:none;font-weight:800">PAY ${amount} →</a></p>`:'';
  const fallback=url?'':`<p>Please make the remaining bank transfer using the payment details you already have. If you need the details again, reply to this email or contact the studio.</p>`;
  let delivered=false;
  if(c.email){
   const r=await sendLoggedNotification({booking:b,customer:c,type:'balance_payment_reminder',subject:`Silkcrayon balance reminder — ${amount} remaining`,html:`<div style="font-family:Arial;background:#08070a;color:#fff;padding:32px"><div style="max-width:620px;margin:auto;border:1px solid #3d3150;padding:30px"><div style="color:#C394FF;letter-spacing:3px;font-size:11px">SILKCRAYON STUDIOS</div><h1>Your remaining balance.</h1><p style="color:#c8c1cc;line-height:1.7">Hi ${artist}, this is your scheduled reminder that <b>${amount}</b> remains for your ${esc(b.service_name)} session on <b>${formatUkDate(b.booking_date)}</b> at ${String(b.start_time).slice(0,5)}.</p><p style="color:#c8c1cc">Already received: <b>£${(paid/100).toFixed(2)}</b> · Session total: <b>£${(total/100).toFixed(2)}</b>.</p>${button}${fallback}<p style="font-size:12px;color:#8f8894">If you have already paid the balance, you can ignore this reminder.</p></div></div>`});
   if(r.ok){sent++;delivered=true;}
  }
  if(b.sms_reminder_consent&&c.phone){
   const paymentText=url?` Pay here: ${url}`:' Please use the bank details already provided, or contact the studio if you need them again.';
   const r=await sendLoggedSms({booking:b,customer:c,type:'balance_payment_reminder_sms',body:`Silkcrayon: ${amount} remains for your ${formatUkDate(b.booking_date)} session.${paymentText} If already paid, ignore this reminder.`});
   if(r.ok){sent++;delivered=true;}
  }
  if(delivered){await db.from('bookings').update({balance_reminder_sent_at:nowIso,updated_at:nowIso}).eq('id',b.id).is('balance_reminder_sent_at',null);balanceRemindersSent++;}
 }
 for(const b of upcoming){
  const c=b.customers;if(!c)continue;
  let working=b,staff=null;
  if(b.service_slug==='dry-hire'&&b.dry_hire_id_required!==false&&!c.dry_hire_id_verified_at){try{await ensureDryHireIdRequest({booking:b,customer:c,resend:true,source:'day_before_reminder'});}catch(e){console.error('Dry Hire ID reminder failed',e?.message||e)}}
  if(b.engineer_user_id){const {data}=await db.from('staff_profiles').select('user_id,full_name,engineer_name,phone,photo_url,email').eq('user_id',b.engineer_user_id).maybeSingle();staff=data||null;}
  else if(b.service_slug!=='dry-hire'&&defaultEngineer){
   const assignedName=defaultEngineer.engineer_name||defaultEngineer.full_name;
   const {data:updated}=await db.from('bookings').update({engineer_user_id:defaultEngineer.user_id,assigned_engineer:assignedName,updated_at:new Date().toISOString()}).eq('id',b.id).is('engineer_user_id',null).select('*,customers(*)').maybeSingle();
   if(updated){working=updated;staff=defaultEngineer;}
  }
  const {count:priorCount}=await db.from('bookings').select('id',{count:'exact',head:true}).eq('customer_id',c.id).lt('booking_date',working.booking_date).in('status',['confirmed','completed']);
  if(c.email){const msg=reminderEmail(working,c,{firstTime:Number(priorCount||0)===0,engineer:staff||null});const r=await sendLoggedNotification({booking:working,customer:c,type:'session_reminder',...msg});if(r.ok)sent++;}
  if(working.sms_reminder_consent&&c.phone){
   const name=staff?.engineer_name||staff?.full_name||'';
   const contact=staff?.phone||'';
   const engineer=name?(contact?` Engineer ${name} — text ${contact} when you reach the lane.`:` Engineer: ${name}.`):'';
   const dry=working.service_slug==='dry-hire'?` Dry hire: no Silkcrayon engineer is included. Bring everything you need to run the session.${working.dry_hire_id_required===false?' No ID check is required for this booking.':c.dry_hire_id_verified_at?' ID verified.':' ID verification is required before access; we have resent the secure ID-check link.'}`:'';
   const sms=await sendLoggedSms({booking:working,customer:c,type:'session_reminder_sms',body:`Silkcrayon reminder: tomorrow at ${String(working.start_time).slice(0,5)}.${dry||engineer} Getting here: https://silkcrayon.com/getting-here`});
   if(sms.ok)sent++;
  }
 }
 for(const b of past){
  const c=b.customers;if(!c?.email)continue;
  const msg=bookAgainEmail(b,c),r=await sendLoggedNotification({booking:b,customer:c,type:'book_again',...msg});if(r.ok)sent++;
 }
 return NextResponse.json({ok:true,today,tomorrow,yesterday,checked:upcoming.length+past.length+balanceDue.length,sent,balanceRemindersChecked:balanceDue.length,balanceRemindersSent,expiredDeliveriesChecked:expiredDeliveries.length,deliveriesDeleted,expiredIdDocsChecked:expiredIdDocs.length,idDocsDeleted});
}
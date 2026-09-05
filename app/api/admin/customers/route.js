import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';

const ALLOWED=new Set(['unknown','subscribed','never_subscribed']);

function missingConsentAuditColumns(error){
 const m=String(error?.message||'').toLowerCase();
 return m.includes('email_consent_recorded_at')||m.includes('email_consent_source')||m.includes('sms_consent_recorded_at')||m.includes('sms_consent_source');
}

export async function POST(req){
 try{
  const ctx=await getStaffContext();
  if(!ctx)return NextResponse.json({error:'Staff access required.'},{status:403});
  const b=await req.json();
  if(!b.fullName?.trim()||!b.email?.trim()||!b.artistName?.trim())return NextResponse.json({error:'Artist name, full name and email are required.'},{status:400});
  if(!b.harmfulMusicPolicy)return NextResponse.json({error:'No Harmful Music Policy acceptance is required.'},{status:400});

  const emailStatus=ALLOWED.has(b.emailMarketingStatus)?b.emailMarketingStatus:'unknown';
  const smsStatus=ALLOWED.has(b.smsMarketingStatus)?b.smsMarketingStatus:'unknown';
  const email=b.email.trim().toLowerCase();
  const db=getAdminDb();
  const {data:existing}=await db.from('customers').select('id').eq('email',email).maybeSingle();
  if(existing)return NextResponse.json({error:'A customer with this email already exists.',id:existing.id},{status:409});

  const {data,error}=await db.from('customers').insert({
   artist_name:b.artistName.trim(),
   full_name:b.fullName.trim(),
   email,
   phone:b.phone?.trim()||null,
   postcode:b.postcode?.trim().toUpperCase()||null,
   area:b.area?.trim()||null,
   preferred_genre:b.genre?.trim()||null,
   instagram:b.instagram?.trim()||null,
   date_of_birth:b.dateOfBirth||null,
   goals:b.goals?.trim()||null,
   marketing_source:b.marketingSource?.trim()||null,
   marketing_consent:emailStatus==='subscribed',
   sms_marketing_consent:smsStatus==='subscribed',
   harmful_music_policy_accepted:true,
   policy_accepted_at:new Date().toISOString(),
   registered_by_user_id:ctx.user.id
  }).select('id').single();
  if(error)throw error;

  const now=new Date().toISOString();
  const basicCrmPatch={
   marketing_status:emailStatus,
   marketing_consent:emailStatus==='subscribed',
   sms_marketing_status:smsStatus,
   sms_marketing_consent:smsStatus==='subscribed',
   updated_at:now
  };
  const auditedCrmPatch={
   ...basicCrmPatch,
   email_consent_recorded_at:emailStatus==='subscribed'?now:null,
   email_consent_source:emailStatus==='subscribed'?'manual_customer_creation':null,
   sms_consent_recorded_at:smsStatus==='subscribed'?now:null,
   sms_consent_source:smsStatus==='subscribed'?'manual_customer_creation':null
  };

  const {error:crmError}=await db.from('crm_contacts').update(auditedCrmPatch).eq('customer_id',data.id);
  if(crmError){
   // Older production databases may not have the V20.6 consent-audit columns yet.
   // Do not block artist creation: preserve the permission state now and let the
   // V20.7.10 migration add the audit timestamp/source columns.
   if(!missingConsentAuditColumns(crmError))throw crmError;
   console.warn('CRM consent audit columns missing; saving core consent state only.',crmError.message);
   const {error:fallbackError}=await db.from('crm_contacts').update(basicCrmPatch).eq('customer_id',data.id);
   if(fallbackError)throw fallbackError;
  }

  return NextResponse.json(data);
 }catch(e){
  console.error('Create customer failed',e);
  return NextResponse.json({error:e.message||'Could not register artist.'},{status:500});
 }
}

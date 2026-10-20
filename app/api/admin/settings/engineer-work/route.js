import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';

const FIELDS=[['windowHours','engineer_offer_window_hours',0.5,168],['urgentWindowHours','engineer_offer_urgent_window_hours',0.25,48],['urgentThresholdHours','engineer_offer_urgent_threshold_hours',0,336],['cutoffHours','engineer_offer_cutoff_hours',0,72]];
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  const b=await req.json().catch(()=>({})),rows=[];
  for(const [field,key,min,max] of FIELDS){const n=Number(b[field]);if(!Number.isFinite(n)||n<min||n>max)return NextResponse.json({error:`${field.replace(/[A-Z]/g,m=>' '+m.toLowerCase())} must be between ${min} and ${max} hours.`},{status:400});rows.push({key,value:String(n)});}
  if(Number(b.urgentWindowHours)>Number(b.windowHours))return NextResponse.json({error:'The urgent window should be shorter than the normal window.'},{status:400});
  const dryFee=Math.round(Number(b.dryHireAccessFee)*100);
  if(!Number.isFinite(dryFee)||dryFee<0||dryFee>100000)return NextResponse.json({error:'Dry hire open & close fee must be between £0 and £1,000.'},{status:400});
  rows.push({key:'engineer_dry_hire_access_fee_pence',value:String(dryFee)});
  rows.push({key:'engineer_auto_payouts',value:b.autoPayouts===false?'false':'true'});
  const {error}=await getAdminDb().from('studio_settings').upsert(rows.map(r=>({...r,updated_at:new Date().toISOString()})),{onConflict:'key'});if(error)throw error;
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e.message||'Could not save.'},{status:500});}
}

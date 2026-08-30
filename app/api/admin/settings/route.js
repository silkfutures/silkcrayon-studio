import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const b=await req.json();
  const hourly=Math.round(Number(b.studioHourlyPrice)*100),fullDay=Math.round(Number(b.fullDayPrice)*100),relaunch=Math.round(Number(b.relaunchOfferPrice)*100),finish=Math.round(Number(b.studioFinishPrice)*100),revisions=Math.round(Number(b.studioFinishRevisions)),turnaround=String(b.studioFinishTurnaround||'').trim();
  for(const [label,value] of [['hourly studio price',hourly],['full-day price',fullDay],['relaunch price',relaunch],['Studio Finish price',finish]])if(!Number.isFinite(value)||value<30||value>1000000)return NextResponse.json({error:`Enter a valid ${label}.`},{status:400});
  if(!Number.isFinite(revisions)||revisions<0||revisions>20)return NextResponse.json({error:'Revisions must be between 0 and 20.'},{status:400});
  if(!turnaround||turnaround.length>80)return NextResponse.json({error:'Enter a turnaround of 80 characters or fewer.'},{status:400});
  const rows=[
   {key:'studio_hourly_price_pence',value:String(hourly)},
   {key:'full_day_price_pence',value:String(fullDay)},
   {key:'relaunch_offer_price_pence',value:String(relaunch)},
   {key:'studio_finish_price_pence',value:String(finish)},
   {key:'studio_finish_turnaround',value:turnaround},
   {key:'studio_finish_revisions',value:String(revisions)}
  ];
  const db=getAdminDb();const {error}=await db.from('studio_settings').upsert(rows,{onConflict:'key'});if(error)throw error;
  // Keep the existing historical promotion code but sync its live commercial price.
  const {error:promoError}=await db.from('promotions').update({offer_price_pence:relaunch,normal_price_pence:hourly*2,updated_at:new Date().toISOString()}).eq('code','RELAUNCH_2H_100');
  if(promoError)console.warn('Could not sync relaunch promotion:',promoError.message);
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e.message||'Could not save settings.'},{status:500})}
}

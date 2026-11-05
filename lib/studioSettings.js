import {getAdminDb} from './supabase';

const DEFAULTS={
 studio_hourly_price_pence:5000,
 full_day_price_pence:40000,
 relaunch_offer_price_pence:9000,
 studio_finish_price_pence:6000,
 studio_finish_turnaround:'within 7 days',
 studio_finish_revisions:1
};
const money=(v,fallback)=>Math.max(30,Number(v||fallback));

export async function getStudioSettings(){
 try{
  const {data,error}=await getAdminDb().from('studio_settings').select('key,value');
  if(error)throw error;
  const map=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  return {
   studioHourlyPricePence:money(map.studio_hourly_price_pence,DEFAULTS.studio_hourly_price_pence),
   fullDayPricePence:money(map.full_day_price_pence,DEFAULTS.full_day_price_pence),
   relaunchOfferPricePence:money(map.relaunch_offer_price_pence,DEFAULTS.relaunch_offer_price_pence),
   studioFinishPricePence:money(map.studio_finish_price_pence,DEFAULTS.studio_finish_price_pence),
   studioFinishTurnaround:String(map.studio_finish_turnaround||DEFAULTS.studio_finish_turnaround),
   studioFinishRevisions:Math.max(0,Number(map.studio_finish_revisions??DEFAULTS.studio_finish_revisions))
  };
 }catch(e){
  console.warn('Studio settings unavailable:',e.message);
  return {
   studioHourlyPricePence:DEFAULTS.studio_hourly_price_pence,
   fullDayPricePence:DEFAULTS.full_day_price_pence,
   relaunchOfferPricePence:DEFAULTS.relaunch_offer_price_pence,
   studioFinishPricePence:DEFAULTS.studio_finish_price_pence,
   studioFinishTurnaround:DEFAULTS.studio_finish_turnaround,
   studioFinishRevisions:DEFAULTS.studio_finish_revisions
  };
 }
}

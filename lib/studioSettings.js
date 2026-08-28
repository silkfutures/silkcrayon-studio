import {getAdminDb} from './supabase';

const DEFAULTS={studio_finish_price_pence:6000,studio_finish_turnaround:'within 7 days',studio_finish_revisions:1};

export async function getStudioSettings(){
 try{
  const {data,error}=await getAdminDb().from('studio_settings').select('key,value');
  if(error)throw error;
  const map=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  return {
   studioFinishPricePence:Math.max(30,Number(map.studio_finish_price_pence||DEFAULTS.studio_finish_price_pence)),
   studioFinishTurnaround:String(map.studio_finish_turnaround||DEFAULTS.studio_finish_turnaround),
   studioFinishRevisions:Math.max(0,Number(map.studio_finish_revisions??DEFAULTS.studio_finish_revisions))
  };
 }catch(e){
  console.warn('Studio settings unavailable:',e.message);
  return {studioFinishPricePence:DEFAULTS.studio_finish_price_pence,studioFinishTurnaround:DEFAULTS.studio_finish_turnaround,studioFinishRevisions:DEFAULTS.studio_finish_revisions};
 }
}

import {getAdminDb} from './supabase';

function liveFilter(p,now=Date.now()){
 if(!p?.active)return false;
 if(p.starts_at&&new Date(p.starts_at).getTime()>now)return false;
 if(p.ends_at&&new Date(p.ends_at).getTime()<now)return false;
 return true;
}
export async function activePromotions(){
 const {data=[]}=await getAdminDb().from('site_promotions').select('*').eq('active',true).order('priority',{ascending:false});
 return data.filter(p=>liveFilter(p));
}
export async function getActivePromotion(slug){
 const {data}=await getAdminDb().from('site_promotions').select('*').eq('slug',slug).maybeSingle();
 return liveFilter(data)?data:null;
}
export async function getBookingPromotion(serviceSlug,duration){
 const promos=await activePromotions();
 return promos.find(p=>p.service_slug===serviceSlug&&Number(p.duration_minutes)===Number(duration))||null;
}

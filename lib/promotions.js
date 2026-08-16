import { getAdminDb } from './supabase';

export function promotionIsLive(p, now=new Date()){
  if(!p?.active) return false;
  const t=now.getTime();
  if(p.starts_at && new Date(p.starts_at).getTime()>t) return false;
  if(p.ends_at && new Date(p.ends_at).getTime()<t) return false;
  return true;
}
export async function getLivePromotions(){
  try{
    const {data,error}=await getAdminDb().from('promotions').select('*').eq('active',true).order('priority',{ascending:false}).order('created_at',{ascending:true});
    if(error) throw error;
    return (data||[]).filter(p=>promotionIsLive(p));
  }catch(e){
    console.warn('Promotions unavailable:',e.message);
    return [];
  }
}
export async function getPromotionFor(serviceSlug,durationMinutes){
  const all=await getLivePromotions();
  return all.find(p=>(!p.service_slug||p.service_slug===serviceSlug)&&(!p.duration_minutes||Number(p.duration_minutes)===Number(durationMinutes)))||null;
}
export function publicPromotion(p){
  if(!p)return null;
  return {id:p.id,code:p.code,name:p.name,badgeText:p.badge_text,headline:p.headline,description:p.description,offerPricePence:p.offer_price_pence,normalPricePence:p.normal_price_pence,serviceSlug:p.service_slug,durationMinutes:p.duration_minutes,ctaText:p.cta_text,endsAt:p.ends_at,usageLimitPerCustomer:p.usage_limit_per_customer,showOnHomepage:p.show_on_homepage,showOnBooking:p.show_on_booking};
}

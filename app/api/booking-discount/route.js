import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/supabase';
import {promotionIsLive} from '../../../lib/promotions';
import {getStudioSettings} from '../../../lib/studioSettings';
import {rateLimit} from '../../../lib/rateLimit';
export async function POST(req){
 try{
  if(!await rateLimit(req,{scope:'promo-check',limit:25,windowSeconds:900}))return NextResponse.json({error:'Too many attempts.'},{status:429});
  const b=await req.json(),code=String(b.code||'').trim().toUpperCase(),duration=Number(b.duration);
  if(!/^[A-Z0-9_-]{3,40}$/.test(code)||b.service!=='vocal-recording'||!Number.isInteger(duration)||duration<60||duration>480)return NextResponse.json({error:'Invalid code or session.'},{status:400});
  const {data:p,error}=await getAdminDb().from('promotions').select('*').eq('code',code).maybeSingle();if(error)throw error;
  if(!p||!promotionIsLive(p)||(p.service_slug&&p.service_slug!==b.service)||(p.duration_minutes&&Number(p.duration_minutes)!==duration)||(p.min_duration_minutes&&duration<Number(p.min_duration_minutes)))return NextResponse.json({error:'This code is unavailable for this session.'},{status:400});
  const settings=await getStudioSettings(),listPricePence=Math.round(duration/60*settings.studioHourlyPricePence),pricePence=p.discount_percent?Math.round(listPricePence*(100-Number(p.discount_percent))/100):Number(p.offer_price_pence);
  return NextResponse.json({ok:true,pricePence,savingsPence:Math.max(0,listPricePence-pricePence)});
 }catch{return NextResponse.json({error:'Could not validate code.'},{status:500})}
}
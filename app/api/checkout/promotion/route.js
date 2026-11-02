import {NextResponse} from 'next/server';
import {getPromotionFor} from '../../../../lib/promotions';
import {getAdminDb} from '../../../../lib/supabase';
import {rateLimit} from '../../../../lib/rateLimit';

export async function POST(request){
  try{
    const body=await request.json();
    if(!await rateLimit(request,{scope:'promo-check',limit:30,windowSeconds:900}))return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});
    const code=String(body.code||'').trim().toUpperCase();
    const service=String(body.service||'');
    const duration=Number(body.duration);
    if(!code||code.length>80||!Number.isInteger(duration)||duration<60)return NextResponse.json({error:'Enter a valid discount code.'},{status:400});
    const promotion=await getPromotionFor(service,duration,code);
    if(!promotion||String(promotion.code||'').toUpperCase()!==code)return NextResponse.json({error:'This code is not available for the selected session.'},{status:400});
    // Final eligibility and per-customer usage are checked again when booking.
    return NextResponse.json({code:promotion.code,offerPricePence:Number(promotion.offer_price_pence),name:promotion.name},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Could not validate discount code.'},{status:400});}
}

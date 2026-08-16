import {NextResponse} from 'next/server';
import {activePromotions} from '../../../../lib/promotions';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const promotions=await activePromotions();
  return NextResponse.json({promotions:promotions.map(p=>({
   slug:p.slug,name:p.name,badgeText:p.badge_text,bannerTitle:p.banner_title,bannerCopy:p.banner_copy,
   ctaLabel:p.cta_label,ctaHref:p.cta_href,serviceSlug:p.service_slug,durationMinutes:p.duration_minutes,
   amountPence:p.amount_pence,listAmountPence:p.list_amount_pence,endsAt:p.ends_at,priority:p.priority
  }))},{headers:{'Cache-Control':'public, max-age=30, stale-while-revalidate=60'}});
 }catch(e){return NextResponse.json({promotions:[]},{status:200})}
}

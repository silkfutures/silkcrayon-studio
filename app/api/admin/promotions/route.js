import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
function clean(v,n=500){return String(v||'').trim().slice(0,n)}
async function owner(){const c=await getStaffContext();return c?.profile?.role==='owner'?c:null}
export async function POST(req){
 try{
  if(!await owner())return NextResponse.json({error:'Owner access required.'},{status:403});
  const b=await req.json(),duration=Number(b.durationMinutes),amount=Math.round(Number(b.amountPounds)*100),list=Math.round(Number(b.listAmountPounds)*100);
  if(!clean(b.name)||!clean(b.slug)||!duration||!amount)return NextResponse.json({error:'Name, slug, duration and offer price are required.'},{status:400});
  const row={slug:clean(b.slug,80).toLowerCase().replace(/[^a-z0-9-]+/g,'-'),name:clean(b.name,120),badge_text:clean(b.badgeText,40)||'OFFER',banner_title:clean(b.bannerTitle,120)||clean(b.name,120),banner_copy:clean(b.bannerCopy,400),cta_label:clean(b.ctaLabel,80)||'Book now',cta_href:clean(b.ctaHref,200)||'/booking',service_slug:clean(b.serviceSlug,80)||'vocal-recording',duration_minutes:duration,amount_pence:amount,list_amount_pence:list||duration*100,active:!!b.active,starts_at:b.startsAt||null,ends_at:b.endsAt||null,max_uses_per_customer:Math.max(1,Number(b.maxUses||1)),priority:Number(b.priority||0),updated_at:new Date().toISOString()};
  const {data,error}=await getAdminDb().from('site_promotions').insert(row).select().single();if(error)throw error;
  return NextResponse.json({promotion:data});
 }catch(e){return NextResponse.json({error:e.message||'Could not create promotion.'},{status:500})}
}

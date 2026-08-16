import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
function clean(v,n=500){return String(v||'').trim().slice(0,n)}
async function owner(){const c=await getStaffContext();return c?.profile?.role==='owner'?c:null}
export async function PATCH(req,{params}){
 try{
  if(!await owner())return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,b=await req.json(),patch={updated_at:new Date().toISOString()};
  if('active'in b)patch.active=!!b.active;
  if('name'in b)patch.name=clean(b.name,120);
  if('badgeText'in b)patch.badge_text=clean(b.badgeText,40);
  if('bannerTitle'in b)patch.banner_title=clean(b.bannerTitle,120);
  if('bannerCopy'in b)patch.banner_copy=clean(b.bannerCopy,400);
  if('ctaLabel'in b)patch.cta_label=clean(b.ctaLabel,80);
  if('ctaHref'in b)patch.cta_href=clean(b.ctaHref,200);
  if('amountPounds'in b)patch.amount_pence=Math.round(Number(b.amountPounds)*100);
  if('listAmountPounds'in b)patch.list_amount_pence=Math.round(Number(b.listAmountPounds)*100);
  if('endsAt'in b)patch.ends_at=b.endsAt||null;
  if('priority'in b)patch.priority=Number(b.priority||0);
  const {data,error}=await getAdminDb().from('site_promotions').update(patch).eq('id',id).select().single();if(error)throw error;
  return NextResponse.json({promotion:data});
 }catch(e){return NextResponse.json({error:e.message||'Could not update promotion.'},{status:500})}
}

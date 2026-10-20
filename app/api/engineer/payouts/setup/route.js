import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {onboardingLink} from '../../../../../lib/engineerPayouts';

// POST from Studio OS → returns the Stripe-hosted onboarding URL.
export async function POST(req){
 try{
  const ctx=await getStaffContext();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  return NextResponse.json({url:await onboardingLink(getAdminDb(),ctx)});
 }catch(e){
  console.error('Connect onboarding failed',e?.type,e?.code,e?.message||e);
  // Show Stripe's real reason (it is Stripe's own text, safe to display) so the owner knows what to fix.
  const reason=String(e?.raw?.message||e?.message||'').replace(/\s+/g,' ').trim().slice(0,400);
  const stripeError=String(e?.type||'').startsWith('Stripe');
  return NextResponse.json({error:stripeError&&reason?`Stripe couldn’t start payout setup: “${reason}” — send this to the studio owner.`:'Could not start payout setup. Please try again.'},{status:500});
 }
}
// GET is Stripe's refresh_url: an expired onboarding link sends the engineer back here for a fresh one.
export async function GET(req){
 const ctx=await getStaffContext();
 if(!ctx)return NextResponse.redirect(new URL('/admin/login?next=/admin/engineer/payouts',req.url));
 try{return NextResponse.redirect(await onboardingLink(getAdminDb(),ctx));}
 catch{return NextResponse.redirect(new URL('/admin/engineer/payouts?setup=error',req.url));}
}

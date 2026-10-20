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
 }catch(e){console.error('Connect onboarding failed',e?.message||e);return NextResponse.json({error:/connect|platform/i.test(String(e?.message))?'Stripe Connect is not enabled on the studio’s Stripe account yet. Ask the owner to enable Connect.':'Could not start payout setup. Please try again.'},{status:500});}
}
// GET is Stripe's refresh_url: an expired onboarding link sends the engineer back here for a fresh one.
export async function GET(req){
 const ctx=await getStaffContext();
 if(!ctx)return NextResponse.redirect(new URL('/admin/login?next=/admin/engineer/payouts',req.url));
 try{return NextResponse.redirect(await onboardingLink(getAdminDb(),ctx));}
 catch{return NextResponse.redirect(new URL('/admin/engineer/payouts?setup=error',req.url));}
}

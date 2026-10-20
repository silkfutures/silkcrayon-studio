import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {dashboardLink} from '../../../../../lib/engineerPayouts';

// Opens the engineer's Stripe Express dashboard (bank details, payout schedule, Instant Payouts where eligible).
export async function GET(req){
 const ctx=await getStaffContext();
 if(!ctx)return NextResponse.redirect(new URL('/admin/login?next=/admin/engineer/payouts',req.url));
 try{const url=await dashboardLink(getAdminDb(),ctx.user.id);return NextResponse.redirect(url||new URL('/admin/engineer/payouts',req.url));}
 catch{return NextResponse.redirect(new URL('/admin/engineer/payouts?setup=error',req.url));}
}

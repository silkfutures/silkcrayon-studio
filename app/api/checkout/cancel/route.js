import {NextResponse} from 'next/server';
import {getStripe} from '../../../../lib/stripe';
import {getAdminDb} from '../../../../lib/supabase';
import {rateLimit} from '../../../../lib/rateLimit';
import {cancelWebsiteCheckout} from '../../../../lib/onsiteCheckout';

export async function POST(req) {
  if (req.headers.get('origin') !== new URL(req.url).origin) return NextResponse.json({error:'Please use the studio website.'},{status:403});
  if (!await rateLimit(req,{scope:'cancel-website-checkout',limit:20,windowSeconds:900})) return NextResponse.json({error:'Please wait before trying again.'},{status:429});
  try {
    const {sessionId,clientSecret} = await req.json();
    if (typeof sessionId !== 'string' || !/^cs_(live|test)_/.test(sessionId) || typeof clientSecret !== 'string' || clientSecret.length > 512) {
      return NextResponse.json({error:'Invalid checkout.'},{status:400});
    }
    await cancelWebsiteCheckout(getStripe(),getAdminDb(),sessionId,clientSecret);
    return NextResponse.json({cancelled:true});
  } catch (error) {
    return NextResponse.json({error:error.message || 'Could not close checkout. Please try again.'},{status:409});
  }
}

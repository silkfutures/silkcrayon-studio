import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/supabase';
import { newToken, tokenHash } from '../../../../lib/customerAuth';
import { sendEmail, customerAccessEmail } from '../../../../lib/notifications';
import {rateLimit} from '../../../../lib/rateLimit';
export async function POST(req){
  const fd=await req.formData();const email=String(fd.get('email')||'').trim().toLowerCase();if(!await rateLimit(req,{scope:'customer-access',limit:5,windowSeconds:900,identity:email}))return NextResponse.redirect(new URL('/account/login?sent=1',req.url),303);const done=()=>NextResponse.redirect(new URL('/account/login?sent=1',req.url),303);
  if(!email||!email.includes('@'))return done();
  const db=getAdminDb();const {data:c}=await db.from('customers').select('id,full_name,artist_name,email').eq('email',email).maybeSingle();if(!c)return done();
  await db.from('customer_access_tokens').delete().eq('customer_id',c.id).is('used_at',null);
  const token=newToken(),expires=new Date(Date.now()+30*60*1000).toISOString();const {error}=await db.from('customer_access_tokens').insert({customer_id:c.id,token_hash:tokenHash(token),expires_at:expires});if(error)return done();
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;const msg=customerAccessEmail(c,`${base}/account/access?token=${encodeURIComponent(token)}`);const sent=await sendEmail({to:c.email,...msg});if(!sent.ok)console.error('Customer access email failed',sent.error||sent);return done();
}

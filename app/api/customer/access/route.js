import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/supabase';
import { newToken, tokenHash } from '../../../../lib/customerAuth';
import { sendEmail, customerAccessEmail } from '../../../../lib/notifications';
export async function POST(req){
  const fd=await req.formData();const email=String(fd.get('email')||'').trim().toLowerCase();const done=()=>NextResponse.redirect(new URL('/account/login?sent=1',req.url),303);
  if(!email||!email.includes('@'))return done();
  const db=getAdminDb();const {data:c}=await db.from('customers').select('id,full_name,artist_name,email').eq('email',email).maybeSingle();if(!c)return done();
  await db.from('customer_access_tokens').delete().eq('customer_id',c.id).is('used_at',null);
  const token=newToken(),expires=new Date(Date.now()+30*60*1000).toISOString();const {error}=await db.from('customer_access_tokens').insert({customer_id:c.id,token_hash:tokenHash(token),expires_at:expires});if(error)return done();
  const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;const msg=customerAccessEmail(c,`${base}/account/access?token=${encodeURIComponent(token)}`);await sendEmail({to:c.email,...msg});return done();
}

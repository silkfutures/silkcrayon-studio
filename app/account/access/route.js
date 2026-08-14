import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/supabase';
import { tokenHash, createCustomerSession } from '../../../lib/customerAuth';

export async function GET(req){
  try{
    const url=new URL(req.url);
    const token=url.searchParams.get('token');
    if(!token) return NextResponse.redirect(new URL('/account/login?invalid=1',req.url));

    const db=getAdminDb();
    const now=new Date().toISOString();
    const {data:access,error}=await db
      .from('customer_access_tokens')
      .select('*')
      .eq('token_hash',tokenHash(token))
      .is('used_at',null)
      .gt('expires_at',now)
      .maybeSingle();

    if(error){
      console.error('Customer access lookup failed',error);
      return NextResponse.redirect(new URL('/account/login?error=1',req.url));
    }
    if(!access) return NextResponse.redirect(new URL('/account/login?invalid=1',req.url));

    const session=await createCustomerSession(access.customer_id);
    const {error:updateError}=await db.from('customer_access_tokens').update({used_at:now}).eq('id',access.id);
    if(updateError) console.error('Customer access token update failed',updateError);

    const res=NextResponse.redirect(new URL('/account',req.url));
    res.cookies.set('sc_customer_session',session.token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==='production',
      sameSite:'lax',
      path:'/',
      maxAge:30*24*60*60
    });
    return res;
  }catch(error){
    console.error('Customer magic-link login failed',error);
    return NextResponse.redirect(new URL('/account/login?error=1',req.url));
  }
}

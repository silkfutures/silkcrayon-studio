import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminDb } from './supabase';

const COOKIE='sc_customer_session';
const DAY=86400000;
export function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex')}
export function newToken(){return crypto.randomBytes(32).toString('base64url')}
export async function createCustomerSession(customerId){
  const token=newToken();
  const expires=new Date(Date.now()+30*DAY).toISOString();
  const {error}=await getAdminDb().from('customer_sessions').insert({customer_id:customerId,token_hash:tokenHash(token),expires_at:expires});
  if(error)throw error;
  return {token,expires};
}
export async function setCustomerCookie(token){
  const store=await cookies();
  store.set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*24*60*60});
}
export async function clearCustomerCookie(){const store=await cookies();store.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0})}
export async function getCustomerContext(){
  const store=await cookies();const token=store.get(COOKIE)?.value;if(!token)return null;
  const db=getAdminDb();
  const {data:session}=await db.from('customer_sessions').select('id,customer_id,expires_at,customers(*)').eq('token_hash',tokenHash(token)).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(!session?.customers)return null;
  db.from('customer_sessions').update({last_seen_at:new Date().toISOString()}).eq('id',session.id).then(()=>{});
  return {session,customer:session.customers};
}
export async function requireCustomer(){const ctx=await getCustomerContext();if(!ctx)redirect('/account/login');return ctx}

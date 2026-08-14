import { NextResponse } from 'next/server';
export async function POST(req){const res=NextResponse.redirect(new URL('/account/login',req.url),303);res.cookies.set('sc_customer_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return res}

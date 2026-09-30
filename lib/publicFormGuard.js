import {NextResponse} from 'next/server';
import {validFormToken} from './formToken';
import {rateLimit} from './rateLimit';
import {looksLikeObviousSpam} from './leadSpam';
export async function publicFormGuard(req,body,{lead=false}={}) {
 const fail=(error,status=400)=>NextResponse.json({error},{status});
 const origin=req.headers.get('origin');
 const allowed=new Set([new URL(req.url).origin,...['https://silkcrayon.com','https://www.silkcrayon.com',process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean).map(x=>new URL(x).origin)]);
 if(req.headers.get('sec-fetch-site')==='cross-site'||(origin&&!allowed.has(origin)))return fail('Please submit this form from the studio website.',403);
 if(!body||typeof body!=='object'||Array.isArray(body))return fail('Invalid form.');
 if(String(body.website||'').trim())return fail('Could not verify this submission. Please contact the studio.',400);
 if(!validFormToken(body.form_token))return fail('Please wait a moment and try again. If this form has been open a long time, refresh the page.',400);
 if(Object.values(body).some(v=>typeof v==='string'&&v.length>6000))return fail('Some details are too long. Please shorten your message.');
 const email=String(body.email||body.buyerEmail||'').trim();
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail('Please enter a valid email address.');
 if(lead&&looksLikeObviousSpam({...body,full_name:body.full_name||body.fullName,artist_or_company:body.artist_or_company||body.artistName,project_details:body.project_details||[body.goals,body.blockers,body.clientBrief].filter(Boolean).join(' ')}))return fail('Please describe your project in a few clear words, or contact the studio directly.');
 try {
  if(!await rateLimit(req,{scope:'public-form-ip',limit:15,windowSeconds:3600,throwOnUnavailable:true}))return fail('Too many submissions. Please try again later.',429);
  if(!await rateLimit(req,{scope:'public-form-email',limit:6,windowSeconds:3600,identity:email,identityOnly:true,throwOnUnavailable:true}))return fail('Too many submissions for this email. Please try again later.',429);
  // A signed token can only submit once, including across server instances.
  if(!await rateLimit(req,{scope:'public-form-token',limit:1,windowSeconds:7200,identity:body.form_token,identityOnly:true,throwOnUnavailable:true}))return fail('This form has already been submitted. Refresh the page before trying again.',409);
 }catch{return fail('Form submissions are temporarily unavailable. Please try again shortly.',503)}
 return null;
}

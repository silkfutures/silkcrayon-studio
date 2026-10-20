import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {offerByToken,respondToOffer} from '../../../../lib/engineerOffers';

// Public: the secret token in the engineer's email is the credential. Responding requires a POST
// so email link scanners that prefetch GET links can never accept or decline on someone's behalf.
export async function POST(req,{params}){
 try{
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  const {token}=await params,b=await req.json().catch(()=>({})),db=getAdminDb();
  const offer=await offerByToken(db,token);
  if(!offer)return NextResponse.json({error:'This offer link is not valid.'},{status:404});
  const r=await respondToOffer(db,{offer,decision:b.decision,reason:b.reason,via:'email_link'});
  return NextResponse.json(r,{status:r.ok?200:409});
 }catch(e){console.error('Offer response failed',e);return NextResponse.json({error:'Could not save your response. Please try again.'},{status:500});}
}

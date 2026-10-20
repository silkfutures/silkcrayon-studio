import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {respondToOffer} from '../../../../../lib/engineerOffers';

export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();if(!ctx)return NextResponse.json({error:'Sign in required.'},{status:401});
  if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid origin.'},{status:403});
  const {id}=await params,b=await req.json().catch(()=>({})),db=getAdminDb();
  const {data:offer}=await db.from('engineer_session_offers').select('*').eq('id',id).maybeSingle();
  if(!offer||offer.engineer_user_id!==ctx.user.id)return NextResponse.json({error:'Offer not found.'},{status:404});
  const r=await respondToOffer(db,{offer,decision:b.decision,reason:b.reason,via:'studio_os',ctx});
  return NextResponse.json(r,{status:r.ok?200:409});
 }catch(e){console.error('Offer response failed',e);return NextResponse.json({error:'Could not save your response.'},{status:500});}
}

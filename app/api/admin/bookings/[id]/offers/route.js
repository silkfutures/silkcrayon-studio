import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {createOfferRound,approveNextBackup,stopOffers,advanceOfferQueue} from '../../../../../../lib/engineerOffers';

function badOrigin(req){return req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin);}
async function owner(req){const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return {res:NextResponse.json({error:'Owner access required.'},{status:403})};if(badOrigin(req))return {res:NextResponse.json({error:'Invalid origin.'},{status:403})};return {ctx};}

// Start an offer round: { engineerUserIds: [primary, backup1, ...], windowHours?: number }
export async function POST(req,{params}){
 try{
  const {ctx,res}=await owner(req);if(res)return res;
  const {id}=await params,b=await req.json().catch(()=>({}));
  const r=await createOfferRound(getAdminDb(),{bookingId:id,engineerUserIds:Array.isArray(b.engineerUserIds)?b.engineerUserIds:[],windowHours:b.windowHours,feePence:b.fee===undefined||b.fee===null||String(b.fee).trim()===''?null:Math.round(Number(b.fee)*100),mode:b.mode==='broadcast'?'broadcast':'sequential',hourlyPence:b.hourly===undefined||b.hourly===null||String(b.hourly).trim()===''?null:Math.round(Number(b.hourly)*100),ctx});
  if(!r.ok)return NextResponse.json({error:r.error},{status:r.status||400});
  return NextResponse.json(r);
 }catch(e){console.error('Offer round failed',e);return NextResponse.json({error:'Could not send the offer. Check that the v20.12.42 migration has been applied.'},{status:500});}
}

// { action: 'approve_next' | 'stop' | 'refresh', offerId? }
export async function PATCH(req,{params}){
 try{
  const {ctx,res}=await owner(req);if(res)return res;
  const {id}=await params,b=await req.json().catch(()=>({})),db=getAdminDb();
  if(b.action==='approve_next'){const r=await approveNextBackup(db,{bookingId:id,offerId:b.offerId||null,ctx});return NextResponse.json(r,{status:r.ok?200:409});}
  if(b.action==='stop')return NextResponse.json(await stopOffers(db,{bookingId:id,ctx}));
  if(b.action==='refresh')return NextResponse.json({ok:true,...await advanceOfferQueue(db,id)});
  return NextResponse.json({error:'Unknown action.'},{status:400});
 }catch(e){console.error('Offer update failed',e);return NextResponse.json({error:'Could not update offers.'},{status:500});}
}

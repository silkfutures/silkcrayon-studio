import {NextResponse} from 'next/server';import {requireOwner} from '../../../../../lib/auth';import {getAdminDb} from '../../../../../lib/supabase';
const allowed=new Set(['quoted','accepted','deposit_due','scheduled','recording','post_production','delivered','lost']);
export async function PATCH(req,{params}){try{
 await requireOwner();const {id}=await params,b=await req.json(),db=getAdminDb();const patch={updated_at:new Date().toISOString()};
 if(allowed.has(b.status))patch.status=b.status;
 const recordingPounds=Number(b.recordingPounds),postPounds=Number(b.postPounds);
 if(Number.isFinite(recordingPounds))patch.recording_amount_pence=Math.max(0,Math.round(recordingPounds*100));
 if(Number.isFinite(postPounds))patch.post_amount_pence=Math.max(0,Math.round(postPounds*100));
 if(Number.isFinite(recordingPounds)||Number.isFinite(postPounds)){
  const {data:current,error:ce}=await db.from('studio_projects').select('recording_amount_pence,post_amount_pence').eq('id',id).single();if(ce)throw ce;
  const recording=Number.isFinite(recordingPounds)?Math.max(0,Math.round(recordingPounds*100)):Number(current.recording_amount_pence||0);
  const post=Number.isFinite(postPounds)?Math.max(0,Math.round(postPounds*100)):Number(current.post_amount_pence||0);
  patch.quote_amount_pence=recording+post;
 }
 const {error}=await db.from('studio_projects').update(patch).eq('id',id);if(error)throw error;return NextResponse.json({ok:true});
}catch(e){return NextResponse.json({error:e.message||'Could not update project.'},{status:500})}}

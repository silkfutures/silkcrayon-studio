import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/supabase';
import { getStaffContext } from '../../../../lib/auth';
export async function POST(request){try{
 const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 const body=await request.json();if(!/^\d{4}-\d{2}-\d{2}$/.test(body.date||'')||!/^\d{2}:\d{2}$/.test(body.start||'')||!/^\d{2}:\d{2}$/.test(body.end||''))return NextResponse.json({error:'Choose a valid date, start and end time.'},{status:400});
 if(body.start>=body.end)return NextResponse.json({error:'End time must be after start time.'},{status:400});
 const {data,error}=await getAdminDb().rpc('create_blockout_locked',{p_booking_date:body.date,p_start_time:body.start,p_end_time:body.end,p_reason:String(body.reason||'').slice(0,240)||null});
 if(error){if(String(error.message).includes('booking_overlap'))return NextResponse.json({error:'That block overlaps a live customer booking.'},{status:409});throw error}
 return NextResponse.json(data);
}catch(e){return NextResponse.json({error:e.message},{status:500})}}
export async function DELETE(request){try{const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});const {id}=await request.json();if(!id)return NextResponse.json({error:'Blockout id is required.'},{status:400});const {error}=await getAdminDb().from('blockouts').delete().eq('id',id);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e.message},{status:500})}}

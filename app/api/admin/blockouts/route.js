import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/supabase';
import { getStaffContext } from '../../../../lib/auth';
export async function POST(request){try{const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});const body=await request.json();if(!body.date||!body.start||!body.end)return NextResponse.json({error:'Date, start and end are required'},{status:400});const {data,error}=await getAdminDb().from('blockouts').insert({booking_date:body.date,start_time:body.start,end_time:body.end,reason:body.reason||null}).select().single();if(error)throw error;return NextResponse.json(data);}catch(e){return NextResponse.json({error:e.message},{status:500})}}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';import {getAdminDb} from '../../../../../../lib/supabase';import {releaseApprovedMixPayout} from '../../../../../../lib/mixEngineer';
export async function POST(_req,{params}){const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required'},{status:403});const {id}=await params;const result=await releaseApprovedMixPayout(getAdminDb(),id);return NextResponse.json(result,{status:result.error?409:200});}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
import {balanceCheck} from '../../../../../lib/engineerPayouts';
export const dynamic='force-dynamic';
// Loaded by the Engineer pay page after it renders, so a slow Stripe call never delays the page.
export async function GET(){
 const ctx=await getStaffContext();if(ctx?.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
 try{return NextResponse.json(await balanceCheck(getAdminDb()),{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'Stripe balance unavailable.'},{status:502});}
}

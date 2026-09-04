import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';

const METHODS=['bank_transfer','cash','external_card','other'];
function pounds(v){return Math.round(Number(v||0)*100)}

export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params; const b=await req.json(); const db=getAdminDb();
  const amount=pounds(b.amount),method=String(b.paymentMethod||'');
  if(!Number.isFinite(amount)||amount<30)return NextResponse.json({error:'Enter an amount of at least £0.30.'},{status:400});
  if(!METHODS.includes(method))return NextResponse.json({error:'Choose how the customer paid.'},{status:400});
  const {data:booking,error:be}=await db.from('bookings').select('id,customer_id,booking_date,start_time,service_name').eq('id',id).maybeSingle();
  if(be)throw be;if(!booking)return NextResponse.json({error:'Booking not found.'},{status:404});
  const extraHours=Math.max(0,Number(b.extraHours||0));
  const description=String(b.description||'').trim()||`Extra studio time${extraHours?` · ${extraHours}h`:''}`;
  const now=new Date().toISOString();
  const {data:payment,error}=await db.from('studio_payments').insert({
   customer_id:booking.customer_id,booking_id:booking.id,created_by_user_id:ctx.user.id,created_by_name:ctx.profile.full_name,
   kind:'session',description,amount_pence:amount,list_amount_pence:amount,hours_credit:0,session_hours:extraHours,status:'paid',paid_at:now,
   payment_method:method,payment_category:'extra_time',discount_code:'none',discount_percent:0,discount_amount_pence:0
  }).select().single();
  if(error)throw error;
  return NextResponse.json({ok:true,payment});
 }catch(e){return NextResponse.json({error:e.message||'Could not record payment.'},{status:500})}
}

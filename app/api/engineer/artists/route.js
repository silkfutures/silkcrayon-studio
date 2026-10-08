import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
export async function POST(req){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='engineer')return NextResponse.json({error:'Engineer access required.'},{status:403});
  const body=await req.json();
  const fullName=String(body.fullName||'').trim(),artistName=String(body.artistName||'').trim();
  const email=String(body.email||'').trim().toLowerCase(),phone=String(body.phone||'').trim();
  if(fullName.length<2||artistName.length<2||fullName.length>120||artistName.length>120||phone.length>40||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)
   return NextResponse.json({error:'Enter a valid full name, artist name and email.'},{status:400});
  if(body.policyAccepted!==true)return NextResponse.json({error:'Confirm the artist accepted the No Harmful Music Policy.'},{status:400});
  const db=getAdminDb();
  const {data:existing,error:lookupError}=await db.from('customers').select('id,registered_by_user_id').eq('email',email).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing){
   if(existing.registered_by_user_id===ctx.user.id)return NextResponse.json({error:'This artist is already in My Artists.'},{status:409});
   const {data:assignment,error:ae}=await db.from('bookings').select('id').eq('customer_id',existing.id).eq('engineer_user_id',ctx.user.id).limit(1);
   if(ae)throw ae;
   return NextResponse.json({error:(assignment||[]).length?'This assigned artist is already in My Artists.':'This artist already exists. Ask the owner to assign them to you; no duplicate was created.'},{status:409});
  }
  const {data,error}=await db.from('customers').insert({
   full_name:fullName,artist_name:artistName,email,phone:phone||null,
   marketing_source:'engineer_referral',marketing_consent:false,sms_marketing_consent:false,
   harmful_music_policy_accepted:true,policy_accepted_at:new Date().toISOString(),
   registered_by_user_id:ctx.user.id
  }).select('id').single();
  if(error){if(error.code==='23505')return NextResponse.json({error:'This customer exists. Ask the owner to link the artist.'},{status:409});throw error;}
  return NextResponse.json({id:data.id},{status:201});
 }catch(error){console.error('Engineer artist creation failed',error);return NextResponse.json({error:'Unable to add artist. Please try again.'},{status:500});}
}
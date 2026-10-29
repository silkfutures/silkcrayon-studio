import {NextResponse} from "next/server";
import {getAdminDb} from "../../../lib/supabase";
import {normalizeCommunityPhone,communityRoles} from "../../../lib/community";
import {rateLimit} from "../../../lib/rateLimit";
export const runtime="nodejs";
const allowed={genres:["R&B / Neo Soul","Rap / Grime","Indie / Alternative","Pop","Electronic / Experimental","Afrobeats / Amapiano","Other"],interests:["Silk Sessions","Producer meetups","Networking events"],availability:["Weekday daytime","Weekday evenings","Saturday daytime","Saturday evenings","Sunday daytime"]};
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export async function POST(request){
 try{
  const raw=await request.text();if(raw.length>10000)return NextResponse.json({error:"Submission too large"},{status:413});
  const b=JSON.parse(raw);if(!b||typeof b!=="object"||Array.isArray(b))return NextResponse.json({error:"Invalid submission"},{status:400});const str=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
  const name=str(b.name,160),email=str(b.email,160).toLowerCase(),role=str(b.role,80);
  if(!name||!validEmail(email)||(role&&!communityRoles.includes(role)))return NextResponse.json({error:"Please enter your name and a valid email address"},{status:400});
  const phoneInput=str(b.phone,31),phone=phoneInput?normalizeCommunityPhone(phoneInput):null;
  if(phoneInput&&!phone)return NextResponse.json({error:"Please enter a valid phone number, including your country code if outside the UK"},{status:400});
  const pick=k=>Array.isArray(b[k])?[...new Set(b[k])].filter(v=>allowed[k].includes(v)):[];const genres=pick("genres"),interests=pick("interests"),availability=pick("availability");
  if(!interests.length)return NextResponse.json({error:"Please choose at least one event you’re interested in"},{status:400});
  const musicLink=str(b.musicLink,500);if(musicLink){try{const u=new URL(musicLink);if(!["https:","http:"].includes(u.protocol))throw Error()}catch{return NextResponse.json({error:"Please enter a valid music or portfolio URL"},{status:400})}}
  const accessNeeds=str(b.accessNeeds,1000);
  if(accessNeeds&&b.accessConsent!==true)return NextResponse.json({error:"Please agree to us using your access information, or leave that optional field blank."},{status:400});
  if(!await rateLimit(request,{scope:"community-interest",limit:10,windowSeconds:3600}))return NextResponse.json({error:"Too many registrations. Please try again later."},{status:429});
  const {error}=await getAdminDb().from("community_interests").insert({name,email,phone,instagram:str(b.instagram,160),role:role||null,instruments:str(b.instruments,240)||null,pronouns:str(b.pronouns,80)||null,access_needs:accessNeeds||null,access_consent_at:accessNeeds?new Date().toISOString():null,genres,interests,availability,influences:str(b.influences,600),music_link:musicLink||null,marketing_consent:b.consent===true,source:"website"});
  if(error){console.error("Community interest insert failed",error.code);return NextResponse.json({error:"Unable to register right now"},{status:500})}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Invalid submission"},{status:400})}
}

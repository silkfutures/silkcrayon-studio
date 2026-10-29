import {NextResponse} from "next/server";
import {getAdminDb} from "../../../lib/supabase";
export const runtime="nodejs";
const allowed={genres:["R&B / Neo Soul","Rap / Grime","Indie / Alternative","Pop","Electronic / Experimental","Afrobeats / Amapiano","Other"],interests:["Silk Sessions","Producer meetups","Networking events"],availability:["Weekday daytime","Weekday evenings","Saturday daytime","Saturday evenings","Sunday daytime"]};
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export async function POST(request){
 try{
  const raw=await request.text();if(raw.length>10000)return NextResponse.json({error:"Submission too large"},{status:413});
  const b=JSON.parse(raw);const str=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
  const name=str(b.name,160),email=str(b.email,160).toLowerCase(),role=str(b.role,80);
  if(!name||!validEmail(email)||!["Vocalist","Rapper","Producer","Songwriter","Multi-disciplinary","Other"].includes(role))return NextResponse.json({error:"Please complete your contact details and role"},{status:400});
  const pick=k=>Array.isArray(b[k])?[...new Set(b[k])].filter(v=>allowed[k].includes(v)):[];const genres=pick("genres"),interests=pick("interests"),availability=pick("availability");
  if(!genres.length||!interests.length||!availability.length)return NextResponse.json({error:"Please select a genre, interest and availability"},{status:400});
  const musicLink=str(b.musicLink,500);if(musicLink){try{const u=new URL(musicLink);if(!["https:","http:"].includes(u.protocol))throw Error()}catch{return NextResponse.json({error:"Please enter a valid music URL"},{status:400})}}
  const {error}=await getAdminDb().from("community_interests").insert({name,email,instagram:str(b.instagram,160),role,genres,interests,availability,influences:str(b.influences,600),music_link:musicLink||null,marketing_consent:b.consent===true,source:"website"});
  if(error){console.error("Community interest insert failed",error.code);return NextResponse.json({error:"Unable to register right now"},{status:500})}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Invalid submission"},{status:400})}
}

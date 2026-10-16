import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/supabase';
import {publicFormGuard} from '../../../lib/publicFormGuard';
import {ownerEmails,sendEmail} from '../../../lib/notifications';
import {escapeProgrammeHtml as esc} from '../../../lib/supportedArtists';
export async function POST(req){
 try{
  const b=await req.json(),blocked=await publicFormGuard(req,b,{lead:true});if(blocked)return blocked;
  const row={};for(const [key,field,max] of [['full_name','fullName',120],['artist_name','artistName',120],['genre','genre',200],['music_links','musicLinks',2000],['goals','goals',3000]]){row[key]=String(b[field]||'').trim();if(!row[key]||row[key].length>max)return NextResponse.json({error:`Please complete ${field} within ${max} characters.`},{status:400});}
  if(b.programmeConsent!==true)return NextResponse.json({error:'Please agree to the programme application terms.'},{status:400});
  row.email=String(b.email).trim().toLowerCase();
  const {error}=await getAdminDb().from('supported_artists').insert(row);
  if(error&&error.code!=='23505')throw error;
  if(!error){
   const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
   for(const to of await ownerEmails())await sendEmail({to,source:'Supported artists application',subject:`Supported artist application — ${row.artist_name}`,html:`<h1>New supported artist application</h1><p>${esc(row.artist_name)} · ${esc(row.genre)}</p><p><a href="${base}/admin/supported-artists">Review application</a></p>`});
  }
  return NextResponse.json({ok:true,message:'Thank you. If this email already has an application, it remains on file. We’ll review your application and contact you; applying does not activate the discount.'});
 }catch{return NextResponse.json({error:'Applications are temporarily unavailable. Please try again later or contact the studio.'},{status:503});}
}

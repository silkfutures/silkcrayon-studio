import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';

const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
export async function POST(req,{params}){
 try{
  const ctx=await getStaffContext();
  if(!ctx||ctx.profile.role!=='owner')return NextResponse.json({error:'Owner access required.'},{status:403});
  const {id}=await params,fd=await req.formData(),file=fd.get('photo');
  if(!file||typeof file.arrayBuffer!=='function')return NextResponse.json({error:'Choose an image.'},{status:400});
  if(!ALLOWED.has(file.type))return NextResponse.json({error:'Use a JPG, PNG or WebP image.'},{status:400});
  if(Number(file.size||0)>5*1024*1024)return NextResponse.json({error:'Profile image must be under 5 MB.'},{status:400});
  const db=getAdminDb(),bucket='staff-photos';
  const {error:bucketError}=await db.storage.createBucket(bucket,{public:true,fileSizeLimit:5*1024*1024,allowedMimeTypes:[...ALLOWED]});
  if(bucketError&&!/already exists|duplicate/i.test(String(bucketError.message||'')))throw bucketError;
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path=`${id}/profile.${ext}`;
  const bytes=Buffer.from(await file.arrayBuffer());
  const {error:ue}=await db.storage.from(bucket).upload(path,bytes,{contentType:file.type,upsert:true,cacheControl:'3600'});
  if(ue)throw ue;
  const {data:pub}=db.storage.from(bucket).getPublicUrl(path);
  const photoUrl=pub?.publicUrl;
  if(!photoUrl)throw new Error('Could not create public profile image URL.');
  const {error:pe}=await db.from('staff_profiles').update({photo_url:photoUrl,updated_at:new Date().toISOString()}).eq('user_id',id);
  if(pe)throw pe;
  return NextResponse.json({ok:true,photoUrl});
 }catch(e){console.error('Staff photo upload failed',e);return NextResponse.json({error:e.message||'Could not upload profile photo.'},{status:500})}
}
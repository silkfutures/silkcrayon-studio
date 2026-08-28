import {NextResponse} from 'next/server';
import {requireOwner} from '../../../../../lib/auth';
import {getAdminDb} from '../../../../../lib/supabase';
const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
export async function POST(req){
 try{
  await requireOwner();const fd=await req.formData(),file=fd.get('image');
  if(!file||typeof file.arrayBuffer!=='function')return NextResponse.json({error:'Choose an image.'},{status:400});
  if(!ALLOWED.has(file.type))return NextResponse.json({error:'Use a JPG, PNG or WebP image.'},{status:400});
  if(Number(file.size||0)>6*1024*1024)return NextResponse.json({error:'Campaign image must be under 6 MB.'},{status:400});
  const db=getAdminDb(),bucket='marketing-images';
  const {error:be}=await db.storage.createBucket(bucket,{public:true,fileSizeLimit:6*1024*1024,allowedMimeTypes:[...ALLOWED]});
  if(be&&!/already exists|duplicate/i.test(String(be.message||'')))throw be;
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg',path=`campaigns/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error:ue}=await db.storage.from(bucket).upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type,cacheControl:'31536000'});if(ue)throw ue;
  const {data:pub}=db.storage.from(bucket).getPublicUrl(path);if(!pub?.publicUrl)throw new Error('Could not create a public image URL.');
  return NextResponse.json({ok:true,url:pub.publicUrl});
 }catch(e){console.error('Marketing image upload failed',e);return NextResponse.json({error:e.message||'Could not upload image.'},{status:500})}
}
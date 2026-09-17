import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../../lib/supabase';
import {recordBookingEvent} from '../../../../lib/bookingEvents';

export const dynamic='force-dynamic';
function bundleFromStoragePath(value){
 try{const parsed=JSON.parse(String(value||''));return Array.isArray(parsed)?parsed.filter(x=>x?.path):null}catch{return null}
}
export async function GET(request,{params}){
 const {token}=await params,db=getAdminDb();
 const {data:d}=await db.from('session_deliveries').select('*,bookings(*)').eq('share_token',token).maybeSingle();
 if(!d)return NextResponse.redirect(new URL(`/files/${token}`,request.url));
 const expired=Boolean(d.delivery_type==='upload'&&d.expires_at&&new Date(d.expires_at).getTime()<=Date.now());
 if(expired||d.deleted_at)return NextResponse.redirect(new URL(`/files/${token}`,request.url));
 let href=d.external_url,downloadName=d.file_name;
 if(d.storage_path){
  const bundle=bundleFromStoragePath(d.storage_path);
  let storagePath=d.storage_path;
  if(bundle?.length){
   const requested=Number(new URL(request.url).searchParams.get('file'));
   const index=Number.isInteger(requested)&&requested>=0&&requested<bundle.length?requested:0;
   storagePath=bundle[index].path;downloadName=bundle[index].name||true;
  }
  const {data,error}=await db.storage.from('session-deliveries').createSignedUrl(storagePath,300,{download:downloadName||true});if(error||!data?.signedUrl)return NextResponse.redirect(new URL(`/files/${token}`,request.url));href=data.signedUrl;
 }
 if(!href)return NextResponse.redirect(new URL(`/files/${token}`,request.url));
 const now=new Date().toISOString(),first=!d.first_downloaded_at;
 await db.from('session_deliveries').update({first_downloaded_at:d.first_downloaded_at||now,last_downloaded_at:now,download_count:Number(d.download_count||0)+1}).eq('id',d.id);
 if(first&&d.bookings)await recordBookingEvent({db,booking:d.bookings,eventType:'files_first_download',reasonCode:d.delivery_type,note:`Customer opened delivery${d.file_name?` · ${d.file_name}`:''}`,snapshot:d.bookings});
 return NextResponse.redirect(href,302);
}

import {NextResponse} from 'next/server';
import {getStaffContext} from '../../../../../../lib/auth';
import {getAdminDb} from '../../../../../../lib/supabase';
import {DRY_HIRE_ID_BUCKET} from '../../../../../../lib/dryHireId';
export async function GET(req,{params}){
 const ctx=await getStaffContext();if(!ctx||ctx.profile.role!=='owner')return new NextResponse('Owner access required.',{status:403});
 const {checkId}=await params,db=getAdminDb();
 const {data:check}=await db.from('dry_hire_id_checks').select('id,status,storage_path,deleted_at').eq('id',checkId).maybeSingle();
 if(!check||check.status!=='submitted'||!check.storage_path||check.deleted_at)return new NextResponse('ID photo is not available.',{status:404});
 const {data,error}=await db.storage.from(DRY_HIRE_ID_BUCKET).createSignedUrl(check.storage_path,300);if(error||!data?.signedUrl)return new NextResponse('Could not create secure preview.',{status:500});
 const out=NextResponse.redirect(data.signedUrl,302);out.headers.set('Cache-Control','no-store, max-age=0');out.headers.set('Referrer-Policy','no-referrer');return out;
}

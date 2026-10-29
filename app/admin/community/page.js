import AdminNav from '../../../components/AdminNav';
import CommunityManager from '../../../components/CommunityManager';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';
export default async function CommunityAdmin(){
 const ctx=await requireOwner(),db=getAdminDb();
 const rows=[];let error=null;
 // Fetch every page so older registrations remain searchable beyond the API row limit.
 for(let offset=0;;offset+=500){
  const result=await db.from('community_interests').select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+499);
  if(result.error){error=result.error;break}
  rows.push(...(result.data||[]));if((result.data||[]).length<500)break;
 }
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">People & community</p><h1>Community.</h1><p className="muted">Build groups around shared sounds and availability, then keep track of every follow-up.</p><a href="/community">View public page ↗</a></div><AdminNav profile={ctx.profile}/></header>{error?<section role="alert"><h2>Registrations couldn’t be loaded.</h2><p>Please retry. If this continues, check that the community database migration has been applied.</p><a href="/admin/community">Reload registrations</a></section>:<CommunityManager initialRows={rows}/>}</main>;
}

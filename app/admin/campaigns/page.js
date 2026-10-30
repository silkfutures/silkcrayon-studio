import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
import AdminNav from '../../../components/AdminNav';
import CampaignDashboard from '../../../components/CampaignDashboard';
export const dynamic='force-dynamic';
export default async function CampaignsPage(){
 const ctx=await requireOwner(),db=getAdminDb();
 const {data,error}=await db.from('page_views').select('created_at,visitor_id,path,utm_source,utm_medium,utm_campaign').gte('created_at',new Date(Date.now()-90*86400000).toISOString()).order('created_at',{ascending:false}).limit(10000);
 return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Silkcrayon OS · Marketing</p><h1>Campaign performance</h1><p className="muted">Measure traffic after a post and distinguish attributed visits from estimated uplift.</p></div><AdminNav profile={ctx.profile}/></header>{error?<p>Tracking data unavailable. Apply the campaign tracking database migration first.</p>:<CampaignDashboard rows={data||[]}/>}</main>;
}
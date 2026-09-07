import AdminNav from '../../../../components/AdminNav';
import AppBackButton from '../../../../components/AppBackButton';
import ManualBookingForm from '../../../../components/ManualBookingForm';
import {requireOwner} from '../../../../lib/auth';
import {getAdminDb} from '../../../../lib/supabase';
import {getStudioSettings} from '../../../../lib/studioSettings';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function NewBooking({searchParams}){
 const ctx=await requireOwner(),db=getAdminDb(),settings=await getStudioSettings(),sp=await searchParams;
 const projectId=String(sp?.project||'').trim();
 const [customerResult,engineerResult,projectResult]=await Promise.all([
  db.from('customers').select('id,full_name,artist_name,email,phone').order('artist_name').limit(1000),
  db.from('staff_profiles').select('user_id,full_name,engineer_name,role,active,email').in('role',['owner','engineer']).eq('active',true).order('full_name'),
  projectId?db.from('studio_projects').select('id,title,customer_id,contact_name,email,recording_hours_included,recording_hours_used,status,project_type').eq('id',projectId).maybeSingle():Promise.resolve({data:null})
 ]);
 const customers=Array.isArray(customerResult.data)?customerResult.data:[];
 const engineers=Array.isArray(engineerResult.data)?engineerResult.data:[];
 const project=projectResult?.data||null;
 return <main className="engineerApp"><header className="mobileTop"><div><p className="eyebrow">Bookings</p><h1>{project?'Add project session.':'Add a session.'}</h1></div><AdminNav profile={ctx.profile}/></header><div className="appBackRow"><AppBackButton fallback={project?`/admin/projects/${project.id}`:'/admin'}/></div><section className="engWelcome compact"><p className="eyebrow">{project?'Project recording':'DM / phone booking'}</p><h1>{project?project.title:'Book it for them.'}</h1><p>{project?'This session is included inside the project recording allowance. It will not create a second customer charge.':'Create the calendar booking, send their confirmation by email/text, and optionally send a bank-payment link in one go.'}</p></section><section className="engSection"><ManualBookingForm customers={customers} engineers={engineers} hourlyPrice={settings.studioHourlyPricePence/100} initialProject={project}/></section></main>
}

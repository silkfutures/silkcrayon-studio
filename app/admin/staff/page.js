import AdminNav from '../../../components/AdminNav';
import {StaffActiveToggle,StaffCreateForm,StaffEditForm,StaffPhotoUpload} from '../../../components/AuthForms';
import {requireOwner} from '../../../lib/auth';
import {getAdminDb} from '../../../lib/supabase';
export const dynamic='force-dynamic';

export default async function Staff(){
 const ctx=await requireOwner(),db=getAdminDb();
 const {data:rows=[]}=await db.from('staff_profiles').select('*').order('role').order('full_name');
 const staff=await Promise.all((Array.isArray(rows)?rows:[]).map(async s=>{
   if(s.email)return s;
   const {data}=await db.auth.admin.getUserById(s.user_id);
   return {...s,email:data?.user?.email||''};
 }));
 return <main className="adminPage">
  <header className="adminHeader"><div><p className="eyebrow">People & permissions</p><h1>Staff.</h1><p className="muted">Edit customer-facing names, contact details and access without rebuilding an account.</p></div><AdminNav profile={ctx.profile}/></header>
  <section className="adminSection"><p className="eyebrow">Add staff</p><h2>Create a Studio OS account</h2><StaffCreateForm/></section>
  <section className="adminSection"><p className="eyebrow">Current team</p><h2>Edit staff profiles</h2><div className="staffProfileGrid">{staff.map(s=><article className="staffProfileCard" key={s.user_id}><div className="staffProfileCardHead"><div><b>{s.engineer_name||s.full_name}</b><small>{s.role} · {s.active?'Active':'Disabled'}</small></div><StaffActiveToggle id={s.user_id} active={s.active}/></div><StaffPhotoUpload staff={s}/><StaffEditForm staff={s}/></article>)}</div></section>
 </main>
}
import Link from 'next/link';
import { LogoutButton } from './AuthForms';
import StaffBottomNav from './StaffBottomNav';

export function EngineerHeader({profile, eyebrow='Engineer'}={}){
  const first=(profile?.full_name||'Engineer').split(' ')[0];
  return <header className="engHeader">
    <div className="engBrandBlock">
      <Link href={profile?.role==='owner'?'/admin':'/admin/engineer'} className="engWordmark">SILKCRAYON</Link>
      <span>{eyebrow}</span>
    </div>
    <div className="engAccount">
      <div className="engAvatar">{first.slice(0,1).toUpperCase()}</div>
      <div><b>{first}</b><small>{profile?.role}</small></div>
      <LogoutButton/>
    </div>
  </header>
}

export function EngineerBottomNav({profile}){
  return <StaffBottomNav role={profile?.role||'engineer'}/>;
}

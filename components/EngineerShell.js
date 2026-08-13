import Link from 'next/link';
import { LogoutButton } from './AuthForms';

export function EngineerHeader({profile, eyebrow='Engineer'}={}){
  const first=(profile?.full_name||'Engineer').split(' ')[0];
  return <header className="engHeader">
    <div className="engBrandBlock">
      <Link href="/admin/engineer" className="engWordmark">SILKCRAYON</Link>
      <span>{eyebrow}</span>
    </div>
    <div className="engAccount">
      <div className="engAvatar">{first.slice(0,1).toUpperCase()}</div>
      <div><b>{first}</b><small>{profile?.role}</small></div>
      <LogoutButton/>
    </div>
  </header>
}

export function EngineerBottomNav(){
  return <nav className="engBottomNav" aria-label="Engineer navigation">
    <Link href="/admin/engineer"><span>⌂</span><small>Today</small></Link>
    <Link href="/admin/artists"><span>◎</span><small>Artists</small></Link>
    <Link href="/admin/payments" className="payNav"><span>£</span><small>Pay</small></Link>
    <Link href="/admin/sessions"><span>✓</span><small>Report</small></Link>
  </nav>
}

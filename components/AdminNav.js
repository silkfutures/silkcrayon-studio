import Link from 'next/link';
import { LogoutButton } from './AuthForms';
export default function AdminNav({profile}){
 const owner=profile?.role==='owner';
 if(!owner)return <nav className="engineerTopLinks"><Link href="/admin/engineer">Engineer home</Link><Link href="/">Website ↗</Link><LogoutButton/></nav>;
 return <nav className="osNav"><Link href="/admin">Overview</Link><Link href="/admin/engineer">Engineer view</Link><Link href="/admin/artists">Artists</Link><Link href="/admin/payments">Payments</Link><Link href="/admin/sessions">Sessions</Link><Link href="/admin/customers">CRM</Link><Link href="/admin/staff">Staff</Link><Link href="/">Website ↗</Link><span className="navIdentity">{profile?.full_name}<small>{profile?.role}</small></span><LogoutButton/></nav>
}

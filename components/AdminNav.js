"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LogoutButton} from './AuthForms';
import StaffBottomNav from './StaffBottomNav';
import {primaryNavigation,navigationActive} from '../lib/osNavigation';
export default function AdminNav({profile}){
 const path=usePathname(),role=profile?.role||'engineer',items=primaryNavigation(role);
 return <><nav className="osNav" aria-label="Studio OS navigation">
 {items.map(item=>{const active=navigationActive(path,item.href,items);return <Link key={item.href} href={item.href} aria-current={active?'page':undefined}>{item.label}</Link>})}
 {role==='owner'&&<Link href="/admin/bookings/new" className="osNewBooking">+ New booking</Link>}
 <Link href="/">Website ↗</Link><span className="navIdentity">{profile?.full_name}<small>{role}</small></span><LogoutButton/>
 </nav><StaffBottomNav role={role}/></>;
}

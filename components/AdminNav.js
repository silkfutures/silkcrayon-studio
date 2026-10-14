'use client';
import Link from 'next/link';
import {LogoutButton} from './AuthForms';
import StaffBottomNav from './StaffBottomNav';
import StaffPrimaryNav from './StaffPrimaryNav';
export default function AdminNav({profile}){
 const role=profile?.role||'engineer';
 return <><nav className="osNav" aria-label="Studio OS navigation"><StaffPrimaryNav role={role}/><div className="osUtilities">
 {role==='owner'&&<Link href="/admin/bookings/new" className="osNewBooking">+ New booking</Link>}
 <Link href="/">Website ↗</Link><span className="navIdentity">{profile?.full_name}<small>{role}</small></span><LogoutButton/>
 </div></nav><StaffBottomNav role={role}/></>;
}

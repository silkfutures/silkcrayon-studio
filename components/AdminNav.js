import Link from 'next/link';
import { LogoutButton } from './AuthForms';
export default function AdminNav({profile}){const owner=profile?.role==='owner';return <nav className="osNav">{owner&&<Link href="/admin">Overview</Link>}{owner&&<Link href="/admin/customers">Customers</Link>}<Link href="/admin/sessions">Sessions</Link>{owner&&<Link href="/admin/staff">Staff</Link>}<Link href="/">Website ↗</Link><span className="navIdentity">{profile?.full_name}<small>{profile?.role}</small></span><LogoutButton/></nav>}

import Link from 'next/link';
export default function AdminNav(){return <nav className="osNav"><Link href="/admin">Overview</Link><Link href="/admin/customers">Customers</Link><Link href="/admin/sessions">Sessions</Link><Link href="/">Website ↗</Link></nav>}

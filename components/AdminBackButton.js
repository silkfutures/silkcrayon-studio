'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export default function AdminBackButton(){
 const pathname=usePathname();
 if(!pathname||pathname==='/admin/more'||pathname.startsWith('/admin/login')||pathname.startsWith('/admin/setup'))return null;
 return <Link className="osGlobalBack" href="/admin/more" aria-label="Open Studio OS menu"><span aria-hidden="true">☰</span> Menu</Link>;
}

'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {primaryNavigation,navigationActive} from '../lib/osNavigation';
export default function StaffPrimaryNav({role='engineer'}){
 const path=usePathname(),items=primaryNavigation(role);
 return <div className="osPrimaryLinks">{items.map(item=><Link key={item.href} href={item.href} aria-current={navigationActive(path,item.href,items)?'page':undefined}>{item.label}</Link>)}</div>;
}

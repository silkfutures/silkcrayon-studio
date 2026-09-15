"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {primaryNavigation,navigationActive} from '../lib/osNavigation';
export default function StaffBottomNav({role='engineer'}){
 const path=usePathname(),items=primaryNavigation(role);
 return <nav className="staffBottomNav" aria-label="Studio OS mobile navigation">{items.map(item=>{const active=navigationActive(path,item.href,items);return <Link key={item.href} href={item.href} className={active?'active':''} aria-current={active?'page':undefined}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></Link>})}</nav>;
}

"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';

function Item({href,label,icon,path,match}){
  const active=match?match(path):path===href||path.startsWith(href+'/');
  return <Link href={href} className={active?'active':''}><span>{icon}</span><small>{label}</small></Link>;
}
export default function StaffBottomNav({role='engineer'}){
  const path=usePathname();
  const home=role==='owner'?'/admin':'/admin/engineer';
  return <nav className="staffBottomNav" aria-label="Studio OS mobile navigation">
    <Item href={home} label={role==='owner'?'Home':'Today'} icon="⌂" path={path} match={p=>role==='owner'?p==='/admin':p==='/admin/engineer'}/>
    <Item href="/admin/artists" label="Artists" icon="◎" path={path}/>
    <Item href="/admin/payments" label="Pay" icon="£" path={path}/>
    <Item href="/admin/sessions" label="Sessions" icon="✓" path={path}/>
    <Item href="/admin/more" label="More" icon="•••" path={path}/>
  </nav>;
}

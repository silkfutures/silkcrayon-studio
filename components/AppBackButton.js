"use client";
import {useRouter} from 'next/navigation';
export default function AppBackButton({fallback='/admin/engineer',label='Back'}){
 const router=useRouter();
 return <button type="button" className="appBackButton" onClick={()=>{if(window.history.length>1)router.back();else router.push(fallback)}}><span>←</span>{label}</button>;
}

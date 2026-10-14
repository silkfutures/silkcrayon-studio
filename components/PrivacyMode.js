'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
export default function PrivacyMode({children,initialHidden=false}){
 const [hidden,setHidden]=useState(initialHidden),path=usePathname();
 const show=!['/admin/login','/admin/setup'].includes(path);
 function toggle(){const next=!hidden;document.cookie=`sc_privacy=${next?'1':'0'}; Path=/admin; Max-Age=31536000; SameSite=Lax`;setHidden(next);}
 return <div className="osPrivacyScope" data-private={hidden?'true':'false'}>{show&&<div className="privacyToolbar"><button type="button" onClick={toggle} aria-pressed={hidden}>{hidden?'◉ Sensitive data hidden':'◎ Hide sensitive data'}</button><small>{hidden?'Presentation mode · financial figures concealed':'Screen privacy'}</small></div>}{children}</div>;
}

'use client';

import {useEffect,useState} from 'react';

export default function MixSetupNotice(){
  const [notice,setNotice]=useState(null);
  useEffect(()=>{
    const raw=sessionStorage.getItem('silkcrayonMixNotice');
    if(!raw)return;
    sessionStorage.removeItem('silkcrayonMixNotice');
    try{setNotice(JSON.parse(raw))}catch{setNotice({kind:'success',text:raw})}
  },[]);
  if(!notice?.text)return null;
  return <div className={`mixSetupNotice ${notice.kind==='warning'?'warning':'success'}`} role="status"><b>{notice.kind==='warning'?'Check customer notification':'Mix setup complete'}</b><span>{notice.text}</span></div>;
}

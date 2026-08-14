"use client";
import {useEffect} from 'react';
export default function PwaRegister(){
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let refreshing=false;
  const onChange=()=>{if(refreshing)return;refreshing=true;window.location.reload()};
  navigator.serviceWorker.addEventListener('controllerchange',onChange);
  navigator.serviceWorker.register('/sw.js?v=12.1',{updateViaCache:'none'}).then(reg=>{reg.update();setInterval(()=>reg.update(),60*60*1000)}).catch(()=>{});
  return()=>navigator.serviceWorker.removeEventListener('controllerchange',onChange);
 },[]);
 return null;
}
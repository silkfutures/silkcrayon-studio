export function primaryNavigation(role){
 return [
  {href:role==='owner'?'/admin':'/admin/engineer',label:'Today',icon:'⌂'},
  {href:'/admin/calendar',label:'Calendar',icon:'▦'},
  {href:'/admin/artists',label:'Artists',icon:'◎'},
  {href:'/admin/payments',label:'Money',icon:'£'},
  {href:'/admin/more',label:'More',icon:'•••'}
 ];
}
export function navigationActive(path,href,items){
 if(href==='/admin')return path==='/admin';
 if(href==='/admin/payments')return path.startsWith('/admin/payments')||path.startsWith('/admin/accounting');
 if(href==='/admin/artists')return path.startsWith('/admin/artists')||path.startsWith('/admin/customers');
 if(href==='/admin/more')return !items.filter(x=>x.href!==href).some(x=>navigationActive(path,x.href,[]));
 return path===href||path.startsWith(href+'/');
}

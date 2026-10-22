// Owner navigation is task-oriented; advanced utilities live in the grouped Menu.
export function primaryNavigation(role){
 if(role==='engineer')return [
  {href:'/admin/more',label:'Menu',icon:'☰'},
  {href:'/admin/engineer',label:'Today',icon:'⌂'},
  {href:'/admin/calendar',label:'Calendar',icon:'▦'},
  {href:'/admin/engineer/mixes',label:'Mixes',icon:'♫'},
  {href:'/admin/engineer/book',label:'Book',icon:'＋'}
 ];
 return [
  {href:'/admin/engineer',label:'Today',icon:'⌂'},
  {href:'/admin/calendar',label:'Bookings',icon:'▦'},
  {href:'/admin/mixes',label:'Mixes',icon:'♫'},
  {href:'/admin/artists',label:'Clients',icon:'◎'},
  {href:'/admin/payments',label:'Money',icon:'£'},
  {href:'/admin/more',label:'Menu',icon:'☰'}
 ];
}
export function navigationActive(path,href,items){
 if(href==='/admin/engineer')return path==='/admin/engineer'||path.startsWith('/admin/engineer/session/');
 if(href==='/admin/calendar')return path.startsWith('/admin/calendar')||path.startsWith('/admin/bookings');
 if(href==='/admin/payments')return path.startsWith('/admin/payments')||path.startsWith('/admin/accounting')||path.startsWith('/admin/invoicing');
 if(href==='/admin/artists')return path.startsWith('/admin/artists')||path.startsWith('/admin/customers');
 if(href==='/admin/mixes')return path.startsWith('/admin/mixes');
 if(href==='/admin/more')return path==='/admin/more'||(path==='/admin')||(!items.some(x=>x.href!==href&&navigationActive(path,x.href,[]))&&path.startsWith('/admin/'));
 return path===href||path.startsWith(href+'/');
}

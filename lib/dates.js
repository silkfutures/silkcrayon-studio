function ordinal(n){
 const mod100=n%100;
 if(mod100>=11&&mod100<=13)return `${n}th`;
 return `${n}${n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
}
export function formatUkDate(value,{year=false,short=false}={}){
 if(!value)return '';
 const raw=String(value);
 const d=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(`${raw}T12:00:00Z`):new Date(raw);
 if(Number.isNaN(d.getTime()))return raw;
 const weekday=new Intl.DateTimeFormat('en-GB',{weekday:short?'short':'long',timeZone:'Europe/London'}).format(d);
 const month=new Intl.DateTimeFormat('en-GB',{month:short?'short':'long',timeZone:'Europe/London'}).format(d);
 const day=Number(new Intl.DateTimeFormat('en-GB',{day:'numeric',timeZone:'Europe/London'}).format(d));
 const y=new Intl.DateTimeFormat('en-GB',{year:'numeric',timeZone:'Europe/London'}).format(d);
 return `${weekday} ${ordinal(day)} ${month}${year?` ${y}`:''}`;
}
export function formatUkDateTime(value){
 if(!value)return '';
 const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
 return `${formatUkDate(value)} · ${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/London'}).format(d)}`;
}
export function formatUkMonth(value){
 const d=value instanceof Date?value:new Date(`${value}-01T12:00:00Z`);
 if(Number.isNaN(d.getTime()))return String(value||'');
 return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'Europe/London'}).format(d);
}

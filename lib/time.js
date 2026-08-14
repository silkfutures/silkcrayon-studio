const TZ='Europe/London';
function offsetMinutes(date,timeZone=TZ){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone,timeZoneName:'longOffset',hour:'2-digit'}).formatToParts(date);
  const name=parts.find(x=>x.type==='timeZoneName')?.value||'GMT';
  const m=name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if(!m)return 0;
  const mins=Number(m[2])*60+Number(m[3]||0);
  return m[1]==='-'?-mins:mins;
}
export function londonDateTimeToUtc(dateStr,timeStr){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateStr||'')||!/^\d{2}:\d{2}$/.test(timeStr||''))return null;
  const [y,m,d]=dateStr.split('-').map(Number),[hh,mm]=timeStr.split(':').map(Number);
  const guess=Date.UTC(y,m-1,d,hh,mm,0,0);
  const first=offsetMinutes(new Date(guess));
  let utc=guess-first*60000;
  const second=offsetMinutes(new Date(utc));
  if(second!==first)utc=guess-second*60000;
  return new Date(utc);
}
export function londonToday(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;
}
export function londonDateOffset(days){
  const d=londonDateTimeToUtc(londonToday(),'12:00');d.setUTCDate(d.getUTCDate()+days);
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;
}
export function hoursUntilLondon(dateStr,timeStr){const d=londonDateTimeToUtc(dateStr,timeStr);return d?(d.getTime()-Date.now())/3600000:-Infinity}

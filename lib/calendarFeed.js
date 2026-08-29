import crypto from 'crypto';

export function calendarFeedToken(){
  const seed=process.env.CALENDAR_FEED_TOKEN||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!seed)return null;
  return crypto.createHash('sha256').update(`silkcrayon-studio-calendar:${seed}`).digest('hex').slice(0,40);
}
export function calendarBaseUrl(){return String(process.env.NEXT_PUBLIC_SITE_URL||'https://silkcrayon.com').replace(/\/$/,'')}
export function calendarFeedUrl(){const token=calendarFeedToken();return token?`${calendarBaseUrl()}/api/calendar/studio.ics?token=${encodeURIComponent(token)}`:null}
export function webcalUrl(url){return url?url.replace(/^https?:\/\//,'webcal://'):null}

function esc(v=''){return String(v).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function dt(date,time){return `${String(date).replaceAll('-','')}T${String(time||'00:00').slice(0,5).replace(':','')}00`}
function stamp(v){const d=v?new Date(v):new Date();return Number.isNaN(d.getTime())?new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'):d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}
export function bookingIcsEvent(b,{siteUrl=calendarBaseUrl()}={}){
  const artist=b.customers?.artist_name||b.customers?.full_name||'Studio session';
  const summary=`Silkcrayon — ${artist} / ${b.service_name||'Studio session'}`;
  const desc=[b.service_name,`Payment: ${String(b.payment_status||'unknown').replaceAll('_',' ')}`,b.assigned_engineer?`Engineer: ${b.assigned_engineer}`:null,`${siteUrl}/admin/engineer/session/${b.id}`].filter(Boolean).join('\n');
  return [
    'BEGIN:VEVENT',
    `UID:booking-${b.id}@silkcrayon.com`,
    `DTSTAMP:${stamp(b.updated_at||b.created_at)}`,
    `DTSTART;TZID=Europe/London:${dt(b.booking_date,b.start_time)}`,
    `DTEND;TZID=Europe/London:${dt(b.booking_date,b.end_time)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(desc)}`,
    `LOCATION:${esc('Silkcrayon Studios, Cardiff Bay')}`,
    `URL:${siteUrl}/admin/engineer/session/${b.id}`,
    `SEQUENCE:${Math.max(0,Math.floor(new Date(b.updated_at||b.created_at||0).getTime()/1000)||0)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT'
  ].join('\r\n');
}
export function calendarIcs(bookings=[]){return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Silkcrayon Studios//Studio OS//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Silkcrayon Studios','X-WR-TIMEZONE:Europe/London',...bookings.map(b=>bookingIcsEvent(b)),'END:VCALENDAR',''].join('\r\n')}
export function singleBookingIcs(b){return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Silkcrayon Studios//Studio OS//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Silkcrayon Studios','X-WR-TIMEZONE:Europe/London',bookingIcsEvent(b),'END:VCALENDAR',''].join('\r\n')}

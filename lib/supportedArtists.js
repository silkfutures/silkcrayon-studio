export const PROGRAMME_RATE = 3000;
export function programmeSlotAllowed(m, date, start, end, duration, today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date())) {
  return Boolean(m && m.status === 'approved' && today >= m.starts_on && today <= m.ends_on && date >= m.starts_on && date <= m.ends_on &&
    Number.isInteger(duration) && duration >= 120 && duration <= 480 && duration % 60 === 0 &&
    m.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
    start >= m.start_time.slice(0,5) && end <= m.end_time.slice(0,5) && end > start &&
    (Number(end.slice(0,2))*60+Number(end.slice(3,5)))-(Number(start.slice(0,2))*60+Number(start.slice(3,5)))===duration);
}
export const escapeProgrammeHtml = value => String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

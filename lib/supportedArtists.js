export const PROGRAMME_RATE = 3000; // Migration/backwards-compatible default only.
export function programmeRate(m){const rate=Number(m?.hourly_price_pence);if(!Number.isInteger(rate)||rate<100||rate>100000)throw new Error('Programme pricing is not configured. Contact the studio.');return rate;}
export const programmeMoney=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(Number(p)/100);
export function programmeTerms(b,defaultRate){
 const pounds=b.hourlyPrice===undefined||b.hourlyPrice===''?defaultRate/100:Number(b.hourlyPrice),rate=Math.round(pounds*100);
 const monthly=Number(b.monthlyHours??8),minimum=Number(b.minimumHours??2);
 if(!Number.isFinite(pounds)||!Number.isInteger(rate)||rate<100||rate>100000||Math.abs(pounds*100-rate)>0.00001)throw new Error('Enter an hourly rate from £1 to £1,000, with up to two decimal places.');
 if(!Number.isInteger(monthly)||monthly<1||monthly>80||!Number.isInteger(minimum)||minimum<1||minimum>8||minimum>monthly)throw new Error('Use 1–80 monthly hours and a 1–8 hour minimum, no greater than the allowance.');
 return {hourly_price_pence:rate,monthly_limit_minutes:monthly*60,min_duration_minutes:minimum*60};
}
export function programmeSlotAllowed(m, date, start, end, duration, today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date())) {
  return Boolean(m && m.status === 'approved' && today >= m.starts_on && today <= m.ends_on && date >= m.starts_on && date <= m.ends_on &&
    Number.isInteger(duration) && duration >= Number(m.min_duration_minutes||120) && duration <= 480 && duration % 60 === 0 &&
    m.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
    start >= m.start_time.slice(0,5) && end <= m.end_time.slice(0,5) && end > start &&
    (Number(end.slice(0,2))*60+Number(end.slice(3,5)))-(Number(start.slice(0,2))*60+Number(start.slice(3,5)))===duration);
}
export const escapeProgrammeHtml = value => String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

import { BUSINESS_HOURS } from "./services";

const toMinutes = (t) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};
const toTime = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export function generateSlots(dateStr, durationMinutes, bookings = [], blockouts = []) {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const hours = BUSINESS_HOURS[day];
  if (!hours) return [];
  const open = toMinutes(hours[0]);
  const close = toMinutes(hours[1]);
  const occupied = [...bookings, ...blockouts].map((x) => [toMinutes(x.start_time), toMinutes(x.end_time)]);
  const slots = [];
  for (let start = open; start + durationMinutes <= close; start += 30) {
    const end = start + durationMinutes;
    const clash = occupied.some(([s, e]) => start < e && end > s);
    if (!clash) slots.push({ start: toTime(start), end: toTime(end) });
  }
  return slots;
}

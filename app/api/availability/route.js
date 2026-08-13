import { NextResponse } from "next/server";
import { SERVICES } from "../../../lib/services";
import { getAdminDb } from "../../../lib/supabase";
import { generateSlots } from "../../../lib/availability";

export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const serviceSlug = searchParams.get("service");
    const duration = Number(searchParams.get("duration"));
    const service = SERVICES[serviceSlug];
    if (!date || !service || !service.durations.includes(duration)) return NextResponse.json({ error: "Invalid availability request" }, { status: 400 });
    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const { data: bookings, error: bookingError } = await db.from("bookings").select("start_time,end_time,status,hold_expires_at").eq("booking_date", date).in("status", ["pending","confirmed"]);
    if (bookingError) throw bookingError;
    const liveBookings = (bookings || []).filter(b => b.status === "confirmed" || !b.hold_expires_at || b.hold_expires_at > nowIso);
    const { data: blockouts, error: blockoutError } = await db.from("blockouts").select("start_time,end_time").eq("booking_date", date);
    if (blockoutError) throw blockoutError;
    return NextResponse.json({ slots: generateSlots(date, duration, liveBookings, blockouts || []) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Availability failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.date || !body.start || !body.end) return NextResponse.json({ error: "Date, start and end are required" }, { status: 400 });
    const { data, error } = await getAdminDb().from("blockouts").insert({ booking_date: body.date, start_time: body.start, end_time: body.end, reason: body.reason || null }).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

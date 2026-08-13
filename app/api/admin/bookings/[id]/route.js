import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../../lib/supabase";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const allowed = ["pending","confirmed","cancelled","completed","no_show"];
    if (!allowed.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const { data, error } = await getAdminDb().from("bookings").update({ status: body.status, internal_notes: body.internalNotes ?? undefined, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

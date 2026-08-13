import { getAdminDb } from "../../../../../lib/supabase";

const esc = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;
export async function GET() {
  const { data = [] } = await getAdminDb().from("customers").select("full_name,artist_name,email,phone,marketing_consent,created_at").order("created_at", { ascending: false });
  const rows = [["Name","Artist name","Email","Phone","Marketing consent","Created"], ...data.map(c=>[c.full_name,c.artist_name,c.email,c.phone,c.marketing_consent,c.created_at])];
  return new Response(rows.map(r=>r.map(esc).join(",")).join("\n"), { headers: { "content-type":"text/csv; charset=utf-8", "content-disposition":"attachment; filename=silkcrayon-customers.csv" } });
}

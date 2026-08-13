import Link from "next/link";
import { getAdminDb } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export default async function CustomersPage() {
  const { data: customers=[] } = await getAdminDb().from("customers").select("*, bookings(id,booking_date,status,amount_pence,payment_status)").order("created_at",{ascending:false});
  return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">CRM</p><h1>Customers</h1></div><nav><Link href="/admin">Dashboard</Link><a href="/api/admin/customers/export">Export CSV</a></nav></header><section className="adminSection"><div className="tableWrap"><table><thead><tr><th>Artist / name</th><th>Contact</th><th>Bookings</th><th>Last booking</th><th>Marketing</th></tr></thead><tbody>{customers.length?customers.map(c=>{const dates=(c.bookings||[]).map(b=>b.booking_date).sort();return <tr key={c.id}><td><b>{c.artist_name||c.full_name}</b><small>{c.artist_name?c.full_name:""}</small></td><td>{c.email}<small>{c.phone||""}</small></td><td>{c.bookings?.length||0}</td><td>{dates.at(-1)||"—"}</td><td>{c.marketing_consent?"Yes":"No"}</td></tr>}):<tr><td colSpan="5">Customer profiles will appear after the first booking.</td></tr>}</tbody></table></div></section></main>;
}

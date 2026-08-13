import Link from "next/link";
import { getAdminDb } from "../../lib/supabase";
import { BookingStatus, BlockoutForm } from "../../components/AdminActions";
import { formatGBP } from "../../lib/services";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const db = getAdminDb();
  const today = new Date().toISOString().slice(0,10);
  const monthStart = today.slice(0,7)+"-01";
  const [{ data: bookings=[] }, { count: customerCount=0 }] = await Promise.all([
    db.from("bookings").select("*, customers(full_name,email,artist_name,phone)").gte("booking_date", monthStart).order("booking_date",{ascending:true}).order("start_time",{ascending:true}),
    db.from("customers").select("*",{count:"exact",head:true}),
  ]);
  const paid = bookings.filter(b=>b.payment_status==="paid").reduce((s,b)=>s+b.amount_pence,0);
  const upcoming = bookings.filter(b=>b.booking_date>=today && !["cancelled","completed"].includes(b.status));
  return <main className="adminPage"><header className="adminHeader"><div><p className="eyebrow">Silkcrayon OS · V1</p><h1>Studio dashboard</h1></div><nav><Link href="/">Website</Link><Link href="/admin/customers">Customers</Link></nav></header><section className="adminMetrics"><div><small>Upcoming</small><b>{upcoming.length}</b></div><div><small>Customers</small><b>{customerCount}</b></div><div><small>Paid this month*</small><b>{formatGBP(paid)}</b></div></section><p className="adminNote">*Based on bookings stored in this V1 database.</p><section className="adminSection"><div className="adminSectionHead"><div><p className="eyebrow">Diary</p><h2>Upcoming bookings</h2></div></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Time</th><th>Customer</th><th>Session</th><th>Paid</th><th>Status</th></tr></thead><tbody>{upcoming.length?upcoming.map(b=><tr key={b.id}><td>{b.booking_date}</td><td>{String(b.start_time).slice(0,5)}–{String(b.end_time).slice(0,5)}</td><td><b>{b.customers?.artist_name||b.customers?.full_name}</b><small>{b.customers?.email}</small></td><td>{b.service_name}</td><td>{b.payment_status==="paid"?formatGBP(b.amount_pence):b.payment_status}</td><td><BookingStatus id={b.id} status={b.status}/></td></tr>):<tr><td colSpan="6">No upcoming bookings yet.</td></tr>}</tbody></table></div></section><section className="adminSection"><p className="eyebrow">Availability</p><h2>Block out studio time</h2><p className="muted">Use this for holidays, maintenance or private sessions. Blockouts disappear from customer availability.</p><BlockoutForm/></section></main>;
}

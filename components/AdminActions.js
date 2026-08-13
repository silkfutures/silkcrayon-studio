"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingStatus({ id, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function change(next) {
    setBusy(true);
    await fetch(`/api/admin/bookings/${id}`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status:next}) });
    router.refresh(); setBusy(false);
  }
  return <select aria-label="Booking status" disabled={busy} value={status} onChange={e=>change(e.target.value)}><option>pending</option><option>confirmed</option><option>completed</option><option>cancelled</option><option value="no_show">no show</option></select>;
}

export function BlockoutForm() {
  const router = useRouter();
  const [msg,setMsg]=useState("");
  async function submit(e) {
    e.preventDefault(); setMsg("Saving…"); const fd=new FormData(e.currentTarget); const body=Object.fromEntries(fd.entries());
    const r=await fetch("/api/admin/blockouts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}); const j=await r.json();
    setMsg(r.ok?"Time blocked.":j.error||"Could not save"); if(r.ok){e.currentTarget.reset();router.refresh();}
  }
  return <form className="blockoutForm" onSubmit={submit}><label>Date<input name="date" type="date" required/></label><label>Start<input name="start" type="time" required/></label><label>End<input name="end" type="time" required/></label><label>Reason<input name="reason" placeholder="Holiday / maintenance"/></label><button className="button outline">Block time</button><small>{msg}</small></form>;
}

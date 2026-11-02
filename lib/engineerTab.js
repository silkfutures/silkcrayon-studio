const closed=p=>p?.status==='paid'||p?.status==='cancelled'||Boolean(p?.paid_via||p?.stripe_transfer_id);
export function engineerTabRows({bookings=[],payouts=[],mixes=[],mixPayouts=[],staff=[]}){
 const rows=[],rates=new Map(staff.map(s=>[s.user_id,s]));
 const sessionPay=new Map(payouts.filter(p=>p.kind==='session'&&p.status!=='cancelled').map(p=>[p.booking_id,p]));
 for(const b of bookings){
  if(!b.engineer_user_id||['cancelled','no_show'].includes(b.status))continue;
  const p=sessionPay.get(b.id);if(p)continue;
  const s=rates.get(b.engineer_user_id);if(!s||s.role!=='engineer')continue;
  const rate=b.engineer_pay_hourly_pence??s.engineer_pay_hourly_pence;
  const amount=b.engineer_fee_pence??(b.service_slug!=='dry-hire'&&rate!=null?Math.round(b.duration_minutes*rate/60):null);
  rows.push({type:'booking',id:b.id,engineerId:b.engineer_user_id,date:b.booking_date,description:`Session · ${b.customers?.artist_name||b.customers?.full_name||b.service_name} · ${b.duration_minutes/60}h`,amount,status:'Assigned',blocked:!amount});
 }
 for(const p of payouts){if(closed(p))continue;const b=p.bookings||bookings.find(b=>b.id===p.booking_id);rows.push({type:'payout',id:p.id,engineerId:p.engineer_user_id,date:b?.booking_date||p.created_at?.slice(0,10),description:`${p.kind==='extra_time'?'Extra time':'Session'} · ${b?.customers?.artist_name||b?.customers?.full_name||p.engineer_name||'Studio work'}`,amount:p.amount_pence,status:p.status==='processing'?'Stripe processing':p.attempts>0?'Reconcile Stripe first':'Owed',blocked:p.status==='processing'||p.attempts>0||!p.amount_pence});}
 const mixPay=new Map(mixPayouts.map(p=>[p.mix_job_id,p]));
 for(const m of mixes){const p=mixPay.get(m.id);if(closed(p))continue;const amount=p?.amount_pence??m.engineer_fee_pence;rows.push({type:'mix',id:m.id,engineerId:m.engineer_user_id,date:m.created_at?.slice(0,10),description:`Mix · ${m.track_title}`,amount,status:p?.status==='processing'?'Stripe processing':p?.status==='failed'?'Reconcile Stripe first':['approved','delivered'].includes(m.status)?'Owed':'Assigned',blocked:['processing','failed'].includes(p?.status)||!amount});}
 return rows.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}

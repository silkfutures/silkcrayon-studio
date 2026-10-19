export function supportedNetSpend(b){
 if(b.payment_method==='credits'||b.project_id)return 0;
 const recorded=Number(b.amount_paid_pence||0);
 const gross=recorded>0?recorded:['paid','part_refunded','refunded'].includes(b.payment_status)?Number(b.amount_pence||0):0;
 const refunded=b.payment_status==='refunded'?gross:Number(b.refunded_amount_pence||0);
 return Math.max(0,gross-refunded);
}
export function supportedProgrammeState(m,today){if(m.status!=='approved')return m.status;if(today<m.starts_on)return 'upcoming';if(today>m.ends_on)return 'expired';return 'active';}
export function supportedUsage(bookings,month,now=new Date().toISOString()){
 return bookings.filter(b=>b.booking_date.startsWith(month)&&b.status!=='cancelled'&&(b.status!=='pending'||!b.hold_expires_at||b.hold_expires_at>now)).reduce((sum,b)=>sum+Number(b.duration_minutes||0),0);
}
export function permittedEngineer(ctx,requested){
 if(!ctx?.user?.id||!['owner','engineer'].includes(ctx.profile?.role))throw new Error('Staff access required.');
 if(ctx.profile.role!=='owner'&&requested!==ctx.user.id)throw new Error('You can only view your own supported artists.');
 return requested;
}

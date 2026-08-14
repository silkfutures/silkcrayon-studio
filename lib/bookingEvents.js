export async function recordBookingEvent({db,booking,eventType,reasonCode=null,note=null,ctx=null,snapshot=null}){
  if(!db||!booking||!eventType)return;
  try{
    await db.from('booking_events').insert({
      booking_id:booking.id||null,
      customer_id:booking.customer_id||booking.customers?.id||null,
      event_type:eventType,
      reason_code:reasonCode||null,
      note:note||null,
      actor_user_id:ctx?.user?.id||null,
      actor_name:ctx?.profile?.full_name||null,
      actor_role:ctx?.profile?.role||null,
      snapshot:snapshot||booking
    });
  }catch(e){
    console.error('booking event log failed',e);
  }
}

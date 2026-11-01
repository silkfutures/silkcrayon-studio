// Checkout reserves availability temporarily; it is not a confirmed session.
// Keep manual/pay-later bookings and bookings with recorded payments visible.
export function isCheckoutHold(booking) {
 return booking.status === 'pending'
  && booking.payment_method === 'stripe'
  && booking.payment_status === 'unpaid'
  && Number(booking.amount_paid_pence || 0) === 0
  && Boolean(booking.hold_expires_at || booking.stripe_checkout_session_id);
}

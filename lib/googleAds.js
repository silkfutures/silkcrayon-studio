export const GOOGLE_ADS_ID = "AW-18437935262";
export const GOOGLE_ADS_PURCHASE_LABEL = "WGT2CISrovEcEJ6h8tdE";
export const GOOGLE_ADS_PURCHASE_DESTINATION = `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`;

// Only server-retrieved Stripe data may be passed to this function.
export async function verifiedPurchase(session, db) {
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid" ||
      session.livemode !== true || session.currency !== "gbp" || !intent?.startsWith("pi_") ||
      !Number.isSafeInteger(session.amount_total) || session.amount_total <= 0) return null;
  const meta = session.metadata || {};
  const table = meta.studio_payment_id ? "studio_payments" : meta.mix_job_id ? "mix_jobs" : "bookings";
  const id = meta.studio_payment_id || meta.mix_job_id || meta.booking_id || session.client_reference_id;
  if (!id) return null;
  const {data: record, error} = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!record || record.stripe_checkout_session_id !== session.id || record.stripe_payment_intent_id !== intent) return null;
  if (table === "bookings" && (record.payment_status !== "paid" || !["confirmed", "completed"].includes(record.status))) return null;
  if (table === "studio_payments" && record.status !== "paid") return null;
  if (table === "mix_jobs" && (!record.paid_at || Number(record.paid_amount_pence) < session.amount_total)) return null;
  return {transaction_id: intent, value: session.amount_total / 100, currency: "GBP"};
}

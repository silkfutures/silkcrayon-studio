// Read the existing receipt, rather than creating a duplicate studio payment.
export function mixAccountingRows(jobs = []) {
 return jobs.filter(job => Number(job.paid_amount_pence) > 0).map(job => ({
  id: job.id, date: job.paid_at || null,
  name: job.customers?.artist_name || job.customers?.full_name,
  email: job.customers?.email, description: job.track_title || 'Mix / master job',
  amount: Number(job.paid_amount_pence), refund: 0, status: 'paid',
  kind: 'Mix / master', source: 'mix_job',
  stripePaid: Boolean(job.stripe_payment_intent_id),
  paymentIntent: job.stripe_payment_intent_id || '',
 }));
}

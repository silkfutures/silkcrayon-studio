export const unpaidMixStages = ['needs_quote', 'quote_sent', 'awaiting_payment'];
export const manualMixPaymentMethods = ['bank_transfer', 'cash', 'card', 'manual'];

export function manualMixPaymentUpdate(job, body, now = new Date().toISOString()) {
  const total = Number(job.quoted_amount_pence);
  if (!Number.isSafeInteger(total) || total < 100) {
    throw new Error('Save a quote of at least £1 before recording payment.');
  }
  const method = body.paymentMethod || 'manual';
  if (!manualMixPaymentMethods.includes(method)) throw new Error('Choose a valid payment method.');
  if (Number(job.paid_amount_pence) >= total && !unpaidMixStages.includes(job.status)) return null;
  return {
    paid_amount_pence: Math.max(total, Number(job.paid_amount_pence || 0)),
    paid_at: job.paid_at || now,
    payment_method: job.payment_method || method,
    payment_reference: job.payment_reference || String(body.paymentReference || '').trim().slice(0, 200) || null,
    status: unpaidMixStages.includes(job.status) ? 'ready_to_start' : job.status,
    updated_at: now,
  };
}

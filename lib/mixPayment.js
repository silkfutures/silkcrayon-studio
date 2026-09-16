export const unpaidMixStages = ['needs_quote', 'quote_sent', 'awaiting_payment'];
export const manualMixPaymentMethods = ['bank_transfer', 'cash', 'card', 'manual'];
export const initialMixPaymentModes = ['unpaid', 'paid', 'partial_paid'];

export function initialMixPaymentState({
  quotedAmountPence,
  paymentMode = 'unpaid',
  paidAmountPence = 0,
  paymentMethod = 'bank_transfer',
  paymentReference = '',
}, now = new Date().toISOString()) {
  const total = Number(quotedAmountPence);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Enter a valid mix quote.');
  if (!initialMixPaymentModes.includes(paymentMode)) throw new Error('Choose a valid payment status.');

  if (paymentMode === 'unpaid') {
    return {
      paid_amount_pence: 0,
      paid_at: null,
      payment_method: null,
      payment_reference: null,
      status: 'awaiting_payment',
    };
  }

  if (total < 1) throw new Error('Add a quote before recording payment.');
  if (!manualMixPaymentMethods.includes(paymentMethod)) throw new Error('Choose a valid payment method.');

  let paid = paymentMode === 'paid' ? total : Number(paidAmountPence);
  if (!Number.isSafeInteger(paid)) throw new Error('Enter a valid amount already received.');
  if (paymentMode === 'partial_paid' && (paid <= 0 || paid >= total)) {
    throw new Error('For a deposit / part payment, the amount received must be more than £0 and less than the full quote.');
  }

  const fullyPaid = paid >= total;
  return {
    paid_amount_pence: fullyPaid ? total : paid,
    paid_at: fullyPaid ? now : null,
    payment_method: paymentMethod,
    payment_reference: String(paymentReference || '').trim().slice(0, 200) || null,
    status: fullyPaid ? 'ready_to_start' : 'awaiting_payment',
  };
}

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

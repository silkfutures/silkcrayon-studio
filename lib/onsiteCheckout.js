// Keep the established Checkout Sessions/webhook flow for both payment UIs.
const registeredDomains = new Map();
const studioDomains = new Set(['silkcrayon.com', 'www.silkcrayon.com', 'silkcrayon.co.uk', 'www.silkcrayon.co.uk']);

export async function ensureWalletDomain(stripe, hostname) {
  if (!studioDomains.has(hostname)) return false;
  if (!registeredDomains.has(hostname)) {
    const registration = (async () => {
      const {data} = await stripe.paymentMethodDomains.list({domain_name: hostname, limit: 1});
      let domain = data[0];
      if (!domain) domain = await stripe.paymentMethodDomains.create({domain_name: hostname}, {idempotencyKey: `studio-wallet-domain-${hostname}`});
      if (!domain.enabled) throw new Error('Wallet domain is disabled');
      if (domain.apple_pay?.status !== 'active') domain = await stripe.paymentMethodDomains.validate(domain.id);
      return domain.apple_pay?.status === 'active';
    })().catch(error => { registeredDomains.delete(hostname); throw error; });
    registeredDomains.set(hostname, registration);
  }
  return registeredDomains.get(hostname);
}

export async function createWebsiteCheckout(stripe, params, {onsite, origin}) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!onsite || !/^pk_(live|test)_/.test(publishableKey || '')) {
    const session = await stripe.checkout.sessions.create(params);
    return {session, response: {url: session.url}};
  }
  // Only register our known studio domains, never a client-supplied host.
  let walletsReady = false;
  try { walletsReady = await ensureWalletDomain(stripe, new URL(origin).hostname); }
  catch (error) { console.error('Wallet domain setup failed', error.message); }
  const {success_url, cancel_url, ...shared} = params;
  const session = await stripe.checkout.sessions.create({
    ...shared,
    // stripe@18 uses the Basil API name for the Elements-based Checkout UI.
    ui_mode: 'custom',
    return_url: success_url,
    payment_method_types: ['card'],
    expires_at: shared.expires_at || Math.floor(Date.now() / 1000) + 30 * 60,
  });
  return {session, response: {
    clientSecret: session.client_secret,
    sessionId: session.id,
    publishableKey,
    returnUrl: success_url.replace('{CHECKOUT_SESSION_ID}', session.id),
    allowPromotionCodes: Boolean(params.allow_promotion_codes),
    walletsReady,
  }};
}

export async function cancelWebsiteCheckout(stripe, db, sessionId, clientSecret) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session.client_secret || session.client_secret !== clientSecret || session.ui_mode !== 'custom') {
    throw new Error('This checkout could not be verified.');
  }
  if (session.status === 'complete' || session.payment_status === 'paid') {
    throw new Error('Payment is already complete. Please check your confirmation.');
  }
  // Expire at Stripe first: a payment racing this action must not be cancelled locally.
  if (session.status === 'open') await stripe.checkout.sessions.expire(session.id);
  const paymentId = session.metadata?.studio_payment_id;
  const bookingId = session.metadata?.booking_id;
  if (paymentId) {
    const {error} = await db.from('studio_payments').update({status:'expired',updated_at:new Date().toISOString()})
      .eq('id',paymentId).eq('stripe_checkout_session_id',session.id).eq('status','pending');
    if (error) throw error;
  } else if (bookingId) {
    const {error} = await db.from('bookings').update({status:'cancelled',hold_expires_at:null,updated_at:new Date().toISOString()})
      .eq('id',bookingId).eq('stripe_checkout_session_id',session.id).eq('status','pending').eq('payment_status','unpaid');
    if (error) throw error;
  }
}

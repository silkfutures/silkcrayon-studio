'use client';
import {useEffect, useRef, useState} from 'react';
import {loadStripe} from '@stripe/stripe-js/pure';
import './OnsiteCheckout.css';

const clients = new Map();
function stripeClient(key) {
  if (!clients.has(key)) clients.set(key, loadStripe(key).catch(error => {clients.delete(key); throw error;}));
  return clients.get(key);
}

export default function OnsiteCheckout({checkout: data, onBack}) {
  const panelNode = useRef(null), walletNode = useRef(null), cardNode = useRef(null), sdk = useRef(null), paying = useRef(false);
  const [session,setSession] = useState(null), [error,setError] = useState(''), [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false), [closing,setClosing] = useState(false), [wallets,setWallets] = useState(false);
  const [promo,setPromo] = useState(''), [applying,setApplying] = useState(false);

  useEffect(() => {
    panelNode.current?.scrollIntoView({behavior:'smooth',block:'start'});
    let active = true, wallet, card;
    const timer = setTimeout(() => {if(active) setError('Payment is taking longer to load. You can go back and use the separate card checkout below.');},20000);
    async function setup() {
      try {
        const stripe = await stripeClient(data.publishableKey);
        if (!stripe || !active) return;
        const checkout = await stripe.initCheckout({fetchClientSecret:async()=>data.clientSecret,
          elementsOptions:{appearance:{theme:'night',variables:{colorPrimary:'#c399ff',colorBackground:'#100c17',colorText:'#f6f1fa',colorDanger:'#ffb3c9',borderRadius:'10px',fontFamily:'Arial, sans-serif'}}}});
        if (!active) return;
        sdk.current = checkout;
        setSession(checkout.session());
        checkout.on('change', value=>{if(active)setSession(value);});
        wallet = checkout.createExpressCheckoutElement({buttonHeight:50,buttonTheme:{applePay:'white-outline'},
          layout:{maxColumns:1,maxRows:2,overflow:'never'},paymentMethodOrder:['apple_pay','google_pay'],
          paymentMethods:{applePay:'always',googlePay:'always',link:'never',amazonPay:'never',paypal:'never',klarna:'never'}});
        wallet.on('ready',event=>{if(active)setWallets(Boolean(event.availablePaymentMethods && Object.values(event.availablePaymentMethods).some(Boolean)));});
        wallet.on('confirm',event=>confirm(checkout,event));
        wallet.on('loaderror',()=>{if(active)setWallets(false);});
        wallet.mount(walletNode.current);
        card = checkout.createPaymentElement({layout:'tabs'});
        card.on('ready',()=>{if(active){clearTimeout(timer);setLoading(false);setError('');}});
        card.on('loaderror',()=>{if(active){clearTimeout(timer);setLoading(false);setError('Could not load payment options. Go back and use the separate card checkout.');}});
        card.mount(cardNode.current);
      } catch {
        if(active){clearTimeout(timer);setLoading(false);setError('Could not load payment options. Go back and use the separate card checkout.');}
      }
    }
    setup();
    return ()=>{active=false;clearTimeout(timer);wallet?.destroy();card?.destroy();sdk.current=null;};
  },[data]);

  async function confirm(checkout,event) {
    if(paying.current)return;
    paying.current=true;setBusy(true);setError('');
    try {
      const result = await checkout.confirm({...(event?{expressCheckoutConfirmEvent:event}:{}),redirect:'if_required'});
      if(result.type==='error')throw new Error(result.error.message);
      window.location.assign(data.returnUrl);
    } catch(error) {setError(error.message||'Payment did not complete. Please try again.');setBusy(false);paying.current=false;}
  }
  async function applyPromo(e) {
    e.preventDefault();if(!sdk.current||!promo.trim())return;
    setApplying(true);setError('');
    try {const result=await sdk.current.applyPromotionCode(promo.trim());if(result.type==='error')throw new Error(result.error.message);setPromo('');}
    catch(error){setError(error.message||'Could not apply this code.');}
    finally{setApplying(false);}
  }
  async function back() {
    if(paying.current)return;
    setClosing(true);setError('');
    try {
      const response=await fetch('/api/checkout/cancel',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({sessionId:data.sessionId,clientSecret:data.clientSecret})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error);
      onBack();
    } catch(error){setError(error.message||'Could not close checkout. Please try again.');setClosing(false);}
  }
  const total=session?.total?.total?.amount;
  return <section ref={panelNode} className="onsiteCheckout" aria-label="Secure payment">
    <p className="eyebrow">Secure payment</p><h2>Complete your payment.</h2>
    {session?.lineItems?.map(item=><p className="onsiteItem" key={item.id}>{item.name}</p>)}
    {total&&<p className="onsiteTotal">Total <strong>{total}</strong></p>}
    {data.allowPromotionCodes&&<form className="onsitePromo" onSubmit={applyPromo}>
      <label htmlFor="checkout-promo">Discount code</label><div><input id="checkout-promo" value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Enter code" autoCapitalize="characters" disabled={busy||closing||applying}/><button type="submit" disabled={!session||busy||closing||applying||!promo.trim()}>{applying?'Applying…':'Apply'}</button></div>
    </form>}
    {session?.discountAmounts?.map((discount,i)=><p className="onsiteDiscount" key={i}>{discount.displayName} · −{discount.amount}</p>)}
    {loading&&<p role="status">Loading secure payment options…</p>}
    <div className="onsiteWallets" style={{opacity:busy||closing||applying?0.5:1,pointerEvents:busy||closing||applying?'none':'auto'}}>
      <div ref={walletNode}/>
    </div>
    {wallets&&<p className="onsiteDivider">Or pay by card</p>}
    <form onSubmit={e=>{e.preventDefault();if(sdk.current&&!closing&&!applying)confirm(sdk.current);}}>
      <div ref={cardNode}/>
      <button className="button primary onsitePay" type="submit" disabled={loading||!session||busy||closing||applying}>{busy?'Confirming payment…':`Pay${total?` ${total}`:''}`}</button>
    </form>
    {error&&<p role="alert" className="errorBox">{error}</p>}
    <p className="onsiteFine">Payments are securely processed by Stripe. Your session or studio hours are confirmed after payment.</p>
    <button className="onsiteBack" type="button" disabled={busy||closing||applying} onClick={back}>{closing?'Closing checkout…':'← Back to details / other payment options'}</button>
  </section>;
}

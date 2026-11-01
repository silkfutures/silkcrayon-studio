import assert from 'node:assert/strict';
import {isCheckoutHold} from '../lib/bookingVisibility.js';
const hold={status:'pending',payment_method:'stripe',payment_status:'unpaid',amount_paid_pence:0,hold_expires_at:'2026-11-01T11:15:00Z'};
assert.equal(isCheckoutHold(hold),true);
assert.equal(isCheckoutHold({...hold,hold_expires_at:'2099-01-01T00:00:00Z'}),true);
assert.equal(isCheckoutHold({...hold,hold_expires_at:null,stripe_checkout_session_id:'cs_test'}),true);
for(const change of [{status:'confirmed'},{payment_status:'paid'},{amount_paid_pence:1000},{payment_method:'bank_transfer'},{payment_method:'cash'},{hold_expires_at:null}]) assert.equal(isCheckoutHold({...hold,...change}),false);
console.log('Booking visibility: live/expired checkout holds excluded; manual, confirmed and paid sessions preserved.');

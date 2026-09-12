import assert from 'node:assert/strict';
import {manualMixPaymentUpdate} from '../lib/mixPayment.js';
const job={quoted_amount_pence:15000,paid_amount_pence:0,status:'needs_quote'};
for(const status of ['needs_quote','quote_sent','awaiting_payment']) {
 const result=manualMixPaymentUpdate({...job,status},{paymentMethod:'bank_transfer',paymentReference:' REF '});
 assert.equal(result.status,'ready_to_start');assert.equal(result.paid_amount_pence,15000);assert.equal(result.payment_reference,'REF');
}
assert.throws(()=>manualMixPaymentUpdate({...job,quoted_amount_pence:0},{}),/Save a quote/);
assert.throws(()=>manualMixPaymentUpdate(job,{paymentMethod:'invalid'}),/valid payment method/);
assert.equal(manualMixPaymentUpdate({...job,status:'mixing',paid_amount_pence:15000},{}),null);
assert.equal(manualMixPaymentUpdate({...job,status:'revisions',paid_amount_pence:5000},{}).status,'revisions');
assert.equal(manualMixPaymentUpdate({...job,paid_amount_pence:16000},{}).paid_amount_pence,16000);
console.log('Mix payment tests passed');

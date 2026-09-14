import assert from 'node:assert/strict';
import {mixAccountingRows} from '../lib/mixAccounting.js';
const rows=mixAccountingRows([
 {id:'manual',quoted_amount_pence:20000,paid_amount_pence:15000,paid_at:'2026-09-14T10:00:00Z',created_at:'2026-08-01',payment_method:'bank_transfer',customers:{full_name:'Artist'}},
 {id:'stripe',paid_amount_pence:5000,paid_at:'2026-09-12',stripe_payment_intent_id:'pi_test'},
 {id:'unpaid',paid_amount_pence:0},
 {id:'legacy',paid_amount_pence:1000}
]);
assert.equal(rows.length,3);
assert.equal(rows[0].date,'2026-09-14T10:00:00Z');
assert.equal(rows[0].amount,15000);
assert.equal(rows[0].source,'mix_job');
assert.equal(rows[1].stripePaid,true);
assert.equal(rows[2].date,null);
assert.equal(rows.reduce((sum,row)=>sum+row.amount,0),21000);
assert.deepEqual(mixAccountingRows([]),[]);
console.log('Mix accounting tests passed');

import assert from 'node:assert/strict';
import {receiptRows,rowsInMonth,receiptNet} from '../lib/receiptRows.js';
import {primaryNavigation,navigationActive} from '../lib/osNavigation.js';
const booking={id:'booking',amount_pence:10000,payment_status:'paid',payment_method:'stripe',created_at:'2026-08-01T12:00:00Z',stripe_payment_intent_id:'pi_base',stripe_checkout_session_id:'cs_base',duration_minutes:120};
const payment={id:'receipt',booking_id:'booking',amount_pence:10000,status:'paid',paid_at:'2026-09-14T12:00:00Z',stripe_payment_intent_id:'pi_base',stripe_checkout_session_id:'cs_base'};
let rows=receiptRows([booking],[payment]);
assert.equal(rows.length,1);assert.equal(receiptNet(rows),10000);
assert.equal(receiptNet(rowsInMonth(rows,'2026-08-01')),0);
assert.equal(receiptNet(rowsInMonth(rows,'2026-09-01')),10000);
rows=receiptRows([booking],[payment,{id:'extra',booking_id:'booking',amount_pence:2500,status:'paid',payment_category:'extra_time',paid_at:payment.paid_at}]);
assert.equal(receiptNet(rows),12500,'Extra time is a separate receipt');
rows=receiptRows([{...booking,refunded_amount_pence:3000,payment_status:'part_refunded'}],[payment]);
assert.equal(receiptNet(rows),7000);assert.equal(rows[0].status,'part_refunded');
rows=receiptRows([{...booking,refunded_amount_pence:3000}],[{...payment,refunded_amount_pence:3000}]);
assert.equal(receiptNet(rows),7000,'Mirrored refunds are counted once');
assert.equal(receiptNet(receiptRows([{...booking,payment_method:'credits'}],[])),0);
assert.equal(receiptNet(receiptRows([{...booking,project_id:'project'}],[])),0,'Included project sessions are not new receipts');
assert.equal(receiptRows([booking],[])[0].dateEstimated,true);
assert.equal(receiptRows([{...booking,paid_at:payment.paid_at}],[])[0].dateEstimated,false);
assert.equal(receiptNet(receiptRows([],[],[{id:'mix',paid_amount_pence:5000,paid_at:payment.paid_at}])),5000);
assert.equal(receiptNet(receiptRows([booking],[{...payment,status:'pending'}])),10000,'Pending payment cannot suppress a paid booking');
assert.equal(receiptNet(receiptRows([booking],[{...payment,stripe_payment_intent_id:'pi_other',stripe_checkout_session_id:'cs_other'}])),20000,'Distinct receipts must not be merged solely by booking ID');
assert.equal(rowsInMonth([{date:'2026-08-31T23:30:00Z'}],'2026-09-01').length,1,'Month boundary uses London time');
assert.deepEqual(receiptRows(),[]);
for(const role of ['owner','engineer']){
 const items=primaryNavigation(role);
 assert.equal(items.length,5);
 assert.equal(items[0].href,role==='owner'?'/admin':'/admin/engineer');
 for(const path of [items[0].href,'/admin/calendar','/admin/artists/123','/admin/accounting','/admin/settings','/admin/projects/123']){
  assert.equal(items.filter(item=>navigationActive(path,item.href,items)).length,1,`${role} ${path} has exactly one active destination`);
 }
}
console.log('Audit patch regression tests passed');
const {loadReceiptRows}=await import('../lib/receiptData.js');
const pages=[];
const fakeDb={from(table){return {select(){return this},order(){return this},async range(start,end){pages.push([table,start,end]);return {data:table==='bookings'?Array.from({length:start===0?500:1},(_,i)=>({id:`b${start+i}`,amount_pence:100,payment_status:'paid',payment_method:'cash',created_at:'2026-09-15'})):[],error:null}}}}};
assert.equal((await loadReceiptRows(fakeDb)).length,501);
assert.ok(pages.some(([table,start])=>table==='bookings'&&start===500));
const brokenDb={from(){return {select(){return this},order(){return this},async range(){return {data:null,error:{message:'database unavailable'}}}}}};
await assert.rejects(()=>loadReceiptRows(brokenDb),/Could not load receipt data/);
console.log('Receipt pagination and failure tests passed');

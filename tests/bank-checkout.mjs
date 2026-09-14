import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app/api/admin/bookings/manual/route.js',import.meta.url),'utf8');
const start=source.indexOf('  const methods=');
const end=source.indexOf('  paymentUrl=session.url;',start);
for(const paymentMode of ['pay_by_bank','card_or_bank']) {
 let request;
 await vm.runInNewContext(`(async()=>{${source.slice(start,end)}})()`,{
 paymentMode,payment:{id:'pay_test'},id:'booking_test',customer:{id:'customer_test',email:'test@example.com'},
 amount:10000,base:'https://example.com',booking:{service_name:'Vocal Recording',booking_date:'2026-09-16',start_time:'17:30',end_time:'19:30'},formatUkDate:x=>x,
 stripe:{checkout:{sessions:{create:async input=>{request=input;return {url:'https://example.com/checkout'}}}}}
 });
 assert.deepEqual(Array.from(request.payment_method_types),paymentMode==='pay_by_bank'?['pay_by_bank']:['card','pay_by_bank']);
 assert.equal(request.payment_method_options,undefined);
 assert.equal(request.line_items[0].price_data.unit_amount,10000);
 assert.equal(request.line_items[0].price_data.currency,'gbp');
 assert.equal(request.metadata.booking_id,'booking_test');
}
console.log('Bank checkout request tests passed');

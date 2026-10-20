import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {bookingDocumentModel as booking,quoteDocumentModel as quote,canAccessDocumentSource as access} from '../lib/documentModel.js';
import {renderDocumentPdf} from '../lib/documentPdf.js';
const output=process.env.PDF_TEST_OUTPUT||join(tmpdir(),'silkcrayon-pdf-tests');mkdirSync(output,{recursive:true});
const b={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',customer_id:'c1',engineer_user_id:'e1',amount_pence:20000,amount_paid_pence:5000,payment_status:'unpaid',payment_method:'bank_transfer',service_name:'Vocal recording',booking_date:'2026-11-01',start_time:'22:00',end_time:'02:00',duration_minutes:240};
const c={id:'c1',full_name:'Example Artist',artist_name:'Example',email:'example@example.com'};
let d=booking(b,c);assert.equal(d.due,15000);assert.equal(d.received,5000);assert.equal(d.kind,'invoice');assert.match(d.session,/\+1 day/);
assert.equal(booking({...b,payment_status:'paid',amount_paid_pence:0},c).received,20000);
assert.equal(booking({...b,payment_method:'credits',payment_status:'paid'},c).received,0);
assert.equal(booking({...b,project_id:'p1',payment_status:'paid'},c).kind,'statement');
assert.equal(booking({...b,payment_status:'refunded'},c).refund,20000);
assert.equal(booking({...b,payment_status:'part_refunded',refunded_amount_pence:3000},c).due,0);
const owner={user:{id:'o'},profile:{role:'owner'}},eng={user:{id:'e1'},profile:{role:'engineer'}};
assert.equal(access('booking',b,eng,null),true);assert.equal(access('booking',{...b,engineer_user_id:'e2'},eng,null),false);assert.equal(access('booking',b,null,{id:'c2'}),false);assert.equal(access('booking',b,null,c),true);assert.equal(access('project',{},eng,null),false);assert.equal(access('project',{},owner,null),true);
const p={id:'p1',title:'Podcast recording and editing',contact_name:'Example Client',email:'client@example.com',quote_revision:2,recording_hours_included:4,recording_amount_pence:26000,post_amount_pence:15000,quote_scope:'Record two podcast episodes with two speakers. Includes microphone setup, recording and a stereo mix.',quote_handover:'WAV masters and MP3 copies supplied via a private download link.',quote_exclusions:'Video capture, captions and social clips are not included.',quote_turnaround:'First edit within five working days. One round of revisions.'};
assert.equal(quote(p).total,41000);
for(const [name,snapshot] of [['invoice',d],['receipt',booking({...b,payment_status:'paid'},c)],['quote',quote(p)],['long-quote',quote({...p,quote_scope:('A detailed scope with Unicode accents café and long notes. ').repeat(130)})]]){
 const bytes=await renderDocumentPdf({number:'SC-'+name.toUpperCase()+'-000001',created_at:'2026-10-20T10:00:00Z',snapshot});assert.equal(bytes.subarray(0,4).toString(),'%PDF');writeFileSync(join(output,`${name}.pdf`),bytes);
}
console.log('PDF models, deposit/refund/credit handling, permissions and rendering passed.');

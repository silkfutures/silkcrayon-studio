import {receiptRows} from './receiptRows.js';
// Page explicitly so reports are not silently capped by the API's default row limit.
async function readAll(db,table){
 const rows=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from(table).select('*,customers(full_name,artist_name,email)').order('id').range(offset,offset+499);
  if(error)throw new Error('Could not load receipt data. Please retry.');
  if(!Array.isArray(data))throw new Error('Receipt data is unavailable.');
  rows.push(...data);if(data.length<500)return rows;
 }
}
export async function loadReceiptRows(db){
 const [bookings,payments,mixes]=await Promise.all(['bookings','studio_payments','mix_jobs'].map(table=>readAll(db,table)));
 return receiptRows(bookings,payments,mixes);
}

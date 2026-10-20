import {createHash} from 'node:crypto';
import {bookingDocumentModel,quoteDocumentModel} from './documentModel.js';
import {renderDocumentPdf} from './documentPdf.js';
function numbered(row){return {...row,number:`SC-${{quote:'Q',invoice:'I',receipt:'R',statement:'S'}[row.kind]}-${String(row.id).padStart(6,'0')}`};}
async function bookingPayTo(db,record){
 // Bank details from Settings → Invoice payment details, so bank-transfer customers know where to pay.
 try{const {data}=await db.from('studio_settings').select('key,value').like('key','invoice_bank_%');const m=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));const sort=String(m.invoice_bank_sort_code||'').replace(/\D/g,''),acc=String(m.invoice_bank_account_number||'').replace(/\D/g,''),name=String(m.invoice_bank_account_name||'').trim();
  if(!name||sort.length!==6||acc.length!==8)return null;
  return {name,accountNumber:acc,sortCode:`${sort.slice(0,2)}-${sort.slice(2,4)}-${sort.slice(4)}`,reference:`Ref ${String(record.id).slice(0,8).toUpperCase()}`};}catch{return null;}
}
export async function ensureDocument(db,source,record,customer={}){
 const snapshot=source==='project'?quoteDocumentModel(record):bookingDocumentModel(record,customer);
 if(source==='booking'&&snapshot.kind==='invoice'&&snapshot.due>0){const payTo=await bookingPayTo(db,record);if(payTo)snapshot.payTo=payTo;}
 const fingerprint=createHash('sha256').update(JSON.stringify({source,id:record.id,snapshot})).digest('hex');
 const {data:old,error:readError}=await db.from('studio_documents').select('*').eq('fingerprint',fingerprint).maybeSingle();if(readError)throw new Error('PDF storage unavailable. Run the v20-12-41 migration.');if(old)return numbered(old);
 const {data,error}=await db.from('studio_documents').insert({source_type:source,source_id:record.id,kind:snapshot.kind,snapshot,fingerprint}).select('*').single();
 if(error?.code==='23505'){const {data:existing,error:e}=await db.from('studio_documents').select('*').eq('fingerprint',fingerprint).single();if(e)throw e;return numbered(existing);}
 if(error)throw error;return numbered(data);
}
export async function documentAttachment(db,source,record,customer){const doc=await ensureDocument(db,source,record,customer),bytes=await renderDocumentPdf(doc);return {filename:`${doc.number}.pdf`,content:bytes.toString('base64'),content_type:'application/pdf'};}

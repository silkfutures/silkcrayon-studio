// Document numbers: continued QuickBooks-style numbers (1155, 1156…) for invoices/receipts once enabled,
// otherwise the original SC-I-000123 style. Quotes and statements always keep SC- numbers.
const PREFIX={quote:'Q',invoice:'I',receipt:'R',statement:'S'};
export function documentNumber(row){return row?.display_number?String(row.display_number):`SC-${PREFIX[row?.kind]||'D'}-${String(row?.id??0).padStart(6,'0')}`;}
export function numbered(row){return {...row,number:documentNumber(row)};}
export function documentFilename(doc){
 if(doc?.display_number)return `${doc.kind==='receipt'?'Receipt':'Invoice'}_${doc.display_number}.pdf`;
 return `${doc?.number||documentNumber(doc)}.pdf`;
}
export async function numberingEnabled(db){
 try{const {data}=await db.from('studio_settings').select('value').eq('key','invoice_numbering_mode').maybeSingle();return data?.value==='sequential';}catch{return false;}
}
export async function nextInvoiceNumber(db){
 const {data,error}=await db.rpc('next_invoice_number');
 if(error)throw new Error('Invoice numbering unavailable. Run the v20-12-51 migration.');
 return String(data);
}

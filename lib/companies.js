// Companies / organisations you invoice (saved billing contacts). Separate from artists.
const clip=(v,n)=>String(v??'').trim().slice(0,n);
export function cleanCompany(input={}){
 const name=clip(input.name,120);
 if(!name)return {ok:false,error:'Enter the company name.'};
 const email=clip(input.email,254).toLowerCase();
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,error:'Enter a valid email.'};
 return {ok:true,row:{name,contact_name:clip(input.contactName??input.contact_name,120)||null,email:email||null,phone:clip(input.phone,50)||null,address:clip(String(input.address??'').replace(/\r/g,''),400)||null,notes:clip(input.notes,1000)||null}};
}
/** What the invoice prints under INVOICE TO. */
export function billToFromCompany(c){
 return {name:c.name,email:c.email||'',address:[c.contact_name?`FAO ${c.contact_name}`:null,c.address].filter(Boolean).join('\n')};
}
export async function createCompany(db,input){
 const c=cleanCompany(input);if(!c.ok)return {ok:false,status:400,error:c.error};
 const {data,error}=await db.from('billing_contacts').insert(c.row).select('*').single();
 if(error){if(error.code==='23505')return {ok:false,status:409,error:'A company with that name already exists.'};throw error;}
 return {ok:true,company:data};
}
export async function updateCompany(db,id,input){
 const c=cleanCompany(input);if(!c.ok)return {ok:false,status:400,error:c.error};
 const {data,error}=await db.from('billing_contacts').update({...c.row,updated_at:new Date().toISOString()}).eq('id',id).select('*').maybeSingle();
 if(error){if(error.code==='23505')return {ok:false,status:409,error:'Another company already has that name.'};throw error;}
 return data?{ok:true,company:data}:{ok:false,status:404,error:'Company not found.'};
}
export async function listCompanies(db){
 const {data,error}=await db.from('billing_contacts').select('*').eq('archived',false).order('name');
 if(error)return [];return data||[];
}

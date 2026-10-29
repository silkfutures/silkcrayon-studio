export const communityRoles=["Vocalist","Rapper","Producer","Songwriter","Instrumentalist / Musician","Videographer / Filmmaker","Photographer","Content creator","Multi-disciplinary","Other"];
export const communityStatuses=['new','contacted','invited','attended','archived'];
export function normalizeCommunityPhone(value){
 if(typeof value!=='string'||value.length>30||!/^[+\d\s().-]+$/.test(value.trim()))return null;
 let phone=value.trim().replace(/[\s().-]/g,'');
 if(phone.startsWith('00'))phone='+'+phone.slice(2);
 if(/^0\d{10}$/.test(phone))phone='+44'+phone.slice(1);
 return /^\+?\d{7,15}$/.test(phone)?phone:null;
}
export function filterCommunity(rows,{query='',interest='',genre='',availability='',status=''}={}){
 const q=query.trim().toLowerCase();
 return rows.filter(r=>(!q||[r.name,r.email,r.phone,r.instagram,r.role,r.instruments].some(v=>String(v||'').toLowerCase().includes(q)))&&(!interest||r.interests?.includes(interest))&&(!genre||r.genres?.includes(genre))&&(!availability||r.availability?.includes(availability))&&(!status||(r.status||'new')===status));
}

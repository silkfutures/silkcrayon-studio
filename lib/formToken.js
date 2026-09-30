import crypto from 'node:crypto';
const secret=()=>process.env.FORM_SECURITY_SECRET||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
export function issueFormToken(now=Date.now()) {
 if(!secret())throw new Error('Form security is not configured');
 const payload=`${now}.${crypto.randomBytes(18).toString('hex')}`;
 return `${payload}.${crypto.createHmac('sha256',secret()).update(payload).digest('hex')}`;
}
export function validFormToken(token,now=Date.now()) {
 if(!secret()||typeof token!=='string'||token.length>200)return false;
 const [time,nonce,signature,...rest]=token.split('.');
 if(rest.length||!/^\d{13}$/.test(time||'')||! /^[a-f0-9]{36}$/.test(nonce||'')||! /^[a-f0-9]{64}$/.test(signature||''))return false;
 const age=now-Number(time);if(age<1200||age>7200000)return false;
 const expected=crypto.createHmac('sha256',secret()).update(`${time}.${nonce}`).digest();
 return crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'));
}

import crypto from 'crypto';import {getAdminDb} from './supabase';
function clientIp(req){return (req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'unknown').split(',')[0].trim()}
function digest(v){return crypto.createHash('sha256').update(String(v)).digest('hex')}
export async function rateLimit(req,{scope,limit,windowSeconds,identity=''}){const key=digest(`${scope}:${clientIp(req)}:${String(identity).toLowerCase()}`);try{const {data,error}=await getAdminDb().rpc('consume_api_rate_limit',{p_key:key,p_limit:limit,p_window_seconds:windowSeconds});if(error)throw error;return data===true}catch(e){console.error('Rate limiter unavailable',e.message);return false}}

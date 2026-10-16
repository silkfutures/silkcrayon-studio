import {getAdminDb} from './supabase';
export async function getSupportedArtistAccess(customerId){
 const {data,error}=await getAdminDb().from('supported_artists').select('starts_on,ends_on').eq('customer_id',customerId).eq('status','approved').maybeSingle();
 if(error||!data)return null;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
 return today<=data.ends_on?data:null;
}

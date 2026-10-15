export async function verifySignupBot(token,{fetcher=fetch,secret=process.env.TURNSTILE_SECRET_KEY}={}){
 if(!secret)return {ok:false,status:503,error:'Signup verification is temporarily unavailable. Please try again later.'};
 if(typeof token!=='string'||!token||token.length>2048)return {ok:false,status:400,error:'Please complete the human verification.'};
 try{
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret,response:token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Verification unavailable');
  const data=await response.json();
  const hosts=new Set(['silkcrayon.com','www.silkcrayon.com']);
  if(process.env.NEXT_PUBLIC_SITE_URL)hosts.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname);
  if(data.success!==true||data.action!=='email_signup'||!hosts.has(data.hostname))return {ok:false,status:403,error:'Verification expired or was unsuccessful. Please verify again.'};
  return {ok:true};
 }catch{return {ok:false,status:503,error:'Signup verification is temporarily unavailable. Please try again.'};}
}

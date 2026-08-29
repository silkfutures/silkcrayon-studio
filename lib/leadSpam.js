export function leadSpamScore(body={}){
  let score=0;
  const name=String(body.full_name||'').trim();
  const email=String(body.email||'').trim().toLowerCase();
  const details=String(body.project_details||'').trim();
  const company=String(body.artist_or_company||'').trim();
  const [local='',domain='']=email.split('@');

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))score+=5;
  if(local.includes('..')||local.split('.').length>=6)score+=4;
  if(domain.includes('..')||domain.split('.').length>=5)score+=3;

  const upper=(name.match(/[A-Z]/g)||[]).length,lower=(name.match(/[a-z]/g)||[]).length;
  if(name.length>=14&&!/\s/.test(name)&&upper>=3&&lower>=5)score+=3;
  if(/^[A-Za-z0-9]{18,}$/.test(name)&&!/[aeiou]{2}/i.test(name))score+=2;
  if(company.length>=16&&!/\s/.test(company)&&(/[A-Z]/.test(company)&&/[a-z]/.test(company)))score+=1;

  if(/^\d{7,}$/.test(details))score+=2;
  if(details&&details.length<4)score+=1;
  if(/(?:https?:\/\/|www\.)/i.test(details)&&(details.match(/https?:\/\//gi)||[]).length>=3)score+=3;
  return score;
}

export function looksLikeObviousSpam(body={}){return leadSpamScore(body)>=4}

const BASE='https://silkcrayon.com';
export default function sitemap(){
 const routes=["/", "/services", "/cardiff-bay", "/booking", "/request-a-call", "/enquire", "/contact", "/faq", "/terms", "/privacy", "/cancellation-policy", "/no-harmful-music-policy", "/recording-studio-cardiff", "/vocal-recording-cardiff", "/music-production-cardiff", "/mixing-mastering-cardiff", "/podcast-recording-cardiff", "/buy-hours", "/gift-studio-time", "/young-creators","/getting-here"];
 return routes.map((route)=>({
  url:`${BASE}${route}`,
  lastModified:new Date(),
  changeFrequency:route==='/'?'daily':'weekly',
  priority:route==='/'?1:(route==='/booking'?0.95:0.8)
 }));
}

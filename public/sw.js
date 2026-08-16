const CACHE='silkcrayon-os-v20-4-7';
const CORE=['/logo.png','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>new Response('Silkcrayon is temporarily offline. Please reconnect and try again.',{status:503,headers:{'content-type':'text/plain'}})));return}
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&['style','script','image','font'].includes(e.request.destination)){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r})))});

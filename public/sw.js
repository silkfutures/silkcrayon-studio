const CACHE='silkcrayon-os-v5';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith((async()=>{try{const r=await fetch(e.request);return r}catch{const c=await caches.match(e.request);return c||new Response('Offline',{status:503})}})())});

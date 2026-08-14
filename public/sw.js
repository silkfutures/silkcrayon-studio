const CACHE='silkcrayon-os-v12-1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request).then(r=>r||new Response('Offline',{status:503}))));return;}
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||new Response('Offline',{status:503}))));
});

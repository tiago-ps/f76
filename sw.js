const CACHE='arsenal-f76-v3';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./arsenal-data-1.txt','./arsenal-data-2.txt','./inventario.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin===self.location.origin && url.pathname.endsWith('/inventario.js')){
  // Atualiza o inventário pela rede sempre que houver conexão; mantém a cópia offline.
  event.respondWith(fetch(req).then(res=>{
   if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
   return res;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./'))));
 }else if(url.origin===self.location.origin){
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match('./'))));
 }else if(req.destination==='image'){
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{caches.open(CACHE).then(c=>c.put(req,res.clone())).catch(()=>{});return res;}).catch(()=>new Response('',{status:504,statusText:'Offline'}))));
 }
});
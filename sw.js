const V='garaz-v13';
const EXT=['cdn.jsdelivr.net','tessdata.projectnaptha.com'];
const ok=t=>t.includes('id="app"')&&t.includes('Garáž');
async function precache(){
  const c=await caches.open(V);
  await Promise.all(['manifest.webmanifest','icon-192.png','icon-512.png'].map(u=>c.add(u).catch(()=>{})));
  try{
    const r=await fetch('index.html',{cache:'reload'});
    if(r.ok&&ok(await r.clone().text()))await c.put('index.html',r);
  }catch(e){}
}
self.addEventListener('install',e=>{e.waitUntil(precache().then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  const same=u.origin===location.origin&&!u.pathname.includes('/api/');
  if(!same&&!EXT.includes(u.hostname))return;
  if(r.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(V),cached=await c.match('index.html');
      const refresh=fetch(r).then(async x=>{
        if(x.ok&&(x.headers.get('content-type')||'').includes('text/html')){
          const t=await x.clone().text();
          if(ok(t))await c.put('index.html',new Response(t,{headers:{'Content-Type':'text/html; charset=utf-8'}}));
        }
        return x;
      }).catch(()=>null);
      if(cached){e.waitUntil(refresh);return cached}
      return (await refresh)||new Response('Offline',{status:503});
    })());
    return;
  }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{
    if(x.ok||x.type==='opaque'){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}
    return x;
  })));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l.length?l[0].focus():clients.openWindow('./')))});
